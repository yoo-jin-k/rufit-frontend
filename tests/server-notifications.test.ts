import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { createRequire } from 'node:module';
import { nativeWebLoader } from './helpers/nativeWeb.ts';
import { createRufitApi } from '../src/api/client.ts';

test('알림 API는 서버 커서와 읽음 대상만 전송합니다', async () => {
  const calls: {url: string; method: string}[] = [];
  const api=createRufitApi({baseUrl:'https://api.example.test',getAccessToken:()=> 'test',fetch:async(url,init)=> {
    calls.push({url:String(url),method:init?.method ?? 'GET'}); return Response.json({});
  }});
  await api.notifications('456'); await api.readNotification('123');
  assert.deepEqual(calls,[{url:'https://api.example.test/api/v1/social/notifications?before=456',method:'GET'}, {url:'https://api.example.test/api/v1/social/notifications/123/read',method:'POST'}]);
});

test('서버 알림은 읽음·수락을 반영하고 계정이 바뀌면 이전 알림을 지웁니다', async () => {
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,ShadowRoot:dom.window.ShadowRoot,IS_REACT_ACT_ENVIRONMENT:true});
  const require=createRequire(`${process.cwd()}/package.json`);
  const native=require('react-native-web');
  const load=nativeWebLoader({
    'react-native':{...native,Modal:({visible,children}:{visible:boolean;children:ReactNode})=>visible?createElement('div',null,children):null},
    '../../components/ScreenLayout':{ui:{}},
    '../profile/ServerFriendsScreen':{ServerFriendsScreen:({initialMemberId,onClose}:{initialMemberId:string;onClose:()=>void})=>createElement('button',{'aria-label':'프로필 닫기',onClick:onClose},initialMemberId)},
  });
  const {NotificationProvider}=load('src/features/notifications/NotificationProvider.tsx') as {NotificationProvider:ComponentType<Record<string,unknown>>};
  const {ServerNotificationButton}=load('src/features/notifications/ServerNotificationButton.tsx') as {ServerNotificationButton:ComponentType};
  const {createRoot}=await import('react-dom/client'); const root=createRoot(document.getElementById('root')!);
  let read=false,accepted=false,readCalls=0;
  const session={scope:{server:'https://api.example.test',accountId:'alice'},isActive:()=>true,api:{
    notifications:async()=>({items:accepted?[]:[{id:'1',type:'FRIEND_REQUEST',actorId:'bob',actorNickname:'운동친구',requestId:'request',createdAt:'2026-11-04T00:00:00Z',read}],unreadCount:read||accepted?0:1,hasNext:false}),
    readNotification:async(id:string)=>{assert.equal(id,'1');read=true;readCalls++;},
    respondFriendRequest:async(id:string,action:string)=>{assert.equal(id,'request');assert.equal(action,'ACCEPT');accepted=true;},
  }};
  const render=(value:unknown)=>root.render(createElement(NotificationProvider,{session:value,accountMode:true},createElement(ServerNotificationButton)));
  const click=async(label:string)=>{const button=document.querySelector(`[aria-label="${label}"]`);assert.ok(button,label);await act(async()=>button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
  try {
    await act(async()=>render(session));
    await click('알림, 읽지 않은 알림 1개');
    assert.equal(readCalls,0,'목록을 여는 것만으로 읽음 처리하지 않습니다.');
    await click('운동친구 프로필 보기');
    assert.match(document.body.textContent!,/bob/);assert.equal(readCalls,1);
    await click('프로필 닫기');await click('수락');
    assert.match(document.body.textContent!,/새로운 알림이 없습니다/);
    await act(async()=>render({...session,scope:{...session.scope,accountId:'carol'},api:{notifications:async()=>({items:[],unreadCount:0,hasNext:false})}}));
    assert.doesNotMatch(document.body.textContent!,/운동친구/);
    assert.ok(document.querySelector('[aria-label="알림, 읽지 않은 알림 0개"]'));
  } finally {await act(async()=>root.unmount());dom.window.close();}
});
