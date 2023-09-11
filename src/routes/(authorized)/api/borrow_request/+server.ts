import { error, fail, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/drizzle';
import {borrow_requests, item_visibility, items, notifications, request_actions, user_community_relations, users} from '$lib/server/db/schema'
import { and, eq, or } from 'drizzle-orm';
import type { BorrowRequest, Item, PublicItemSafe } from '$lib/types';
import { pusher } from '$lib/server/pusher';
import { item_select } from '$lib/server/db/selects';

export const POST = (async ({ locals, url}) => {
    if (!locals.user) {
        throw error(401);
    }
    const user = locals.user;
    if(!url.searchParams.get('item_id')){
        throw error(400);
    }
    const item_id = Number(url.searchParams.get('item_id'));

    const found_items = await db.select(item_select).from(items).where(eq(items.id, item_id));
    if(found_items.length==0){
        throw error(404);
    }
    const visibility = await db.select().from(item_visibility).where(eq(item_visibility.item_id,item_id)).innerJoin(user_community_relations,and(eq(item_visibility.community_id,user_community_relations.community_id),and(eq(user_community_relations.user_id, user.id),or(eq(user_community_relations.role, 'ADMIN'),eq(user_community_relations.role, 'MEMBER')))));
    const item = found_items[0];
    if(item.owner_id!=user.id && !item.offered && visibility.length==0){
        throw error(401);
    }
    if(item.holder_id==user.id){
        throw error(400);
    }
    const found_borrow_requests:Array<BorrowRequest> =
    await db.select().from(borrow_requests).where(and(or(eq(borrow_requests.status,'PENDING'),eq(borrow_requests.status,'ACCEPTED')),eq(borrow_requests.item_id, Number(item.id)),eq(borrow_requests.borrower_id, Number(user.id))));
    if(found_borrow_requests.length>0) {
        throw error(400);
    }
    if(user.id==item.owner_id){
        const new_borrow_requests:BorrowRequest[] = await db.insert(borrow_requests).values({
            lender_id: item.holder_id as number,
            borrower_id: user.id as number,
            item_id: item.id as number,
            status: 'ACCEPTED'
            }).returning();
        const borrow_request:BorrowRequest=new_borrow_requests[0];
        await db.insert(request_actions).values({
            borrow_request_id:borrow_request.id,
            user_id:user.id,
            type: 'CREATE',
            message: '',
            }).returning();
        const notification = await db.insert(notifications).values({
                user_id: borrow_request.lender_id,
                text: "User " + locals.user.user_name + " wants " + item.name + ' back',
                url: '/borrow_request/'+String(borrow_request.id),
            }).returning();
        await pusher.sendToUser(String(borrow_request.lender_id), "notification", notification[0]);
        return json(borrow_request);
    }
    else{
        const new_borrow_requests:BorrowRequest[] = await db.insert(borrow_requests).values({
            lender_id: item.holder_id as number,
            borrower_id: user.id as number,
            item_id: item.id as number,
            }).returning();
        const borrow_request:BorrowRequest=new_borrow_requests[0];
        await db.insert(request_actions).values({
            borrow_request_id:borrow_request.id,
            user_id:user.id,
            type: 'CREATE',
            message: '',
            }).returning();
        const notification = await db.insert(notifications).values({
                user_id: borrow_request.lender_id,
                text: "User " + locals.user.user_name + " wants " + item.name,
                url: '/borrow_request/'+String(borrow_request.id),
            }).returning();
        await pusher.sendToUser(String(borrow_request.lender_id), "notification", notification[0]);
        return json(borrow_request);
    }
}) satisfies RequestHandler;