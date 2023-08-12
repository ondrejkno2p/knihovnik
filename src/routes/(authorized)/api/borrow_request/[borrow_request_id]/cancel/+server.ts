import { error, fail, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/drizzle';
import {borrow_requests,items,notifications,request_actions} from '$lib/server/db/schema'
import { eq } from 'drizzle-orm';
import type { BorrowRequest } from '$lib/types';
import { pusher } from '$lib/server/pusher';

export const POST = (async ({ request, params, locals, url, route }) => {
  if (!locals.user) {
    throw error(401);
  }
  if (!params.borrow_request_id) {
    throw error(400);
  }
  const user_id = locals.user.id;
  const borrow_request_id = params.borrow_request_id as string;
  const found_borrow_requests =
  await db.select({
    item: {
      name: items.name,
      description: items.description,
      id: items.id,
      owner_id: items.owner_id,
    },
    borrow_request: {
      status: borrow_requests.status,
      id: borrow_requests.id,
      borrower_id: borrow_requests.borrower_id,
      lender_id: borrow_requests.lender_id,
      item_id: borrow_requests.item_id,
      timestamp: borrow_requests.timestamp,
    },}).from(borrow_requests).where(eq(borrow_requests.id, Number(borrow_request_id))).innerJoin(items,eq(items.id,borrow_requests.item_id));
  if(found_borrow_requests.length==0) {
    throw error(404);
  }
  const old_borrow_request=found_borrow_requests[0].borrow_request;
  const item = found_borrow_requests[0].item;
  if(old_borrow_request.borrower_id!=user_id){
    throw error(401);
  }
  if(old_borrow_request.status!='PENDING'){
    throw error(400);
  }
  try {
    const delete_borrow_requests:Promise<any> = db.delete(borrow_requests).where(eq(borrow_requests.id, Number(borrow_request_id))).returning();
    const delete_request_actions:Promise<any> = db.delete(request_actions).where(eq(request_actions.borrow_request_id, Number(borrow_request_id))).returning();
    const cancel_notification:Promise<any> = db.insert(notifications).values({
      user_id: old_borrow_request.lender_id,
      text: "User " + locals.user.user_name + " no longer wants " + item.name,
    }).returning();
    const results:any = await Promise.all([delete_borrow_requests,delete_request_actions,cancel_notification]);
    pusher.sendToUser(String(old_borrow_request.lender_id), "notification", results[2][0]);
    return json(results[0][0]);
  } catch (err) {
    throw error(500);
  }

}) satisfies RequestHandler;