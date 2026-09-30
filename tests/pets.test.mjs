import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zeroPadValue, toBeHex, id} from 'ethers';
import {COLLECTIONS, NFT_ABI, readOwnedPets, parsePet, battleEfficiency} from '../src/wallet/pets.ts';
const A='0x0000000000000000000000000000000000000001', B='0x0000000000000000000000000000000000000002';
const image='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg"><rect width="8" height="8"/></svg>');
const uri='data:application/json;base64,'+btoa(JSON.stringify({name:'Untrusted display name',image,attributes:[{trait_type:'Scenery',value:'Coastal'},{trait_type:'Character',value:'Cellular'}]}));
const log=(c,token,from,to,index)=>({address:c.address,topics:[id('Transfer(address,address,uint256)'),zeroPadValue(from,32),zeroPadValue(to,32),toBeHex(token,32)],blockNumber:'0x3c2e09f',logIndex:toBeHex(index),removed:false});
function fixture({owner=A, incomplete=false, wrongChain=false, transferred=false, brokenMetadata=false, generation=2}={}){
 const calls=[];
 const rpc=async(method,params)=>{
  calls.push([method,params]);
  if(method==='eth_chainId')return wrongChain?'0x1':'0x1237';
  if(method==='eth_blockNumber')return '0x3c2e09f';
  if(method==='eth_getLogs'){
   if(incomplete)return [];
   const q=params[0],c=COLLECTIONS.find(c=>c.address===q.address);
   const logs=[log(c,7,B,A,1),...(transferred?[log(c,7,A,B,2),log(c,8,B,A,3)]:[])];
   return logs.filter(l=>BigInt(l.blockNumber)>=BigInt(q.fromBlock)&&BigInt(l.blockNumber)<=BigInt(q.toBlock)&&(!q.topics[1]||q.topics[1]===l.topics[1])&&(!q.topics[2]||q.topics[2]===l.topics[2]));
  }
  if(method==='eth_call'){
   const parsed=NFT_ABI.parseTransaction({data:params[0].data});
   const values={balanceOf:1n,ownerOf:owner,tokenURI:brokenMetadata?'https://bad.example/metadata':uri,generation};
   return NFT_ABI.encodeFunctionResult(parsed.name,[values[parsed.name]]);
  }
  throw Error(method);
 };
 return {rpc,calls};
}
test('loads both canonical collections, original art and scenery with distinct IDs even for matching token numbers',async()=>{
 const f=fixture(),pets=await readOwnedPets(A,undefined,f.rpc);
 assert.equal(pets.length,2);assert.notEqual(pets[0].id,pets[1].id);
 assert.equal(pets[0].collection,'Genesis');assert.equal(pets[0].generation,0);
 assert.equal(pets[1].generation,2);assert.equal(pets[1].land,'Coastal');assert.equal(pets[1].imageUrl,image);
 assert.equal(pets[1].name,'Generations #7');
 assert.ok(f.calls.filter(([method])=>method==='eth_call').every(([,params])=>params[1]==='0x3c2e09f'));
});
test('outgoing transfers remove former pets; incoming pets become playable',async()=>{
 const {rpc}=fixture({transferred:true});const pets=await readOwnedPets(A,undefined,rpc);
 assert.ok(pets.every(p=>p.tokenId==='8'));
});
test('incomplete transfer history fails closed rather than presenting an empty roster',async()=>{
 await assert.rejects(readOwnedPets(A,undefined,fixture({incomplete:true}).rpc),/incomplete/);
});
test('ownerOf independently rejects inaccurate history',async()=>{
 await assert.rejects(readOwnedPets(A,undefined,fixture({owner:B}).rpc),/ownership changed/);
});
test('wrong chain and unsupported metadata fail closed',async()=>{
 await assert.rejects(readOwnedPets(A,undefined,fixture({wrongChain:true}).rpc),/Robinhood/);
 await assert.rejects(readOwnedPets(A,undefined,fixture({brokenMetadata:true}).rpc),/metadata/);
});
test('zero balances return an explicit empty roster without history scans',async()=>{
 const f=fixture();const rpc=async(m,p,s)=>m==='eth_call'?NFT_ABI.encodeFunctionResult('balanceOf',[0]):f.rpc(m,p,s);
 assert.deepEqual(await readOwnedPets(A,undefined,rpc),[]);
 assert.ok(!f.calls.some(([method])=>method==='eth_getLogs'));
});
test('temporary generation zero is excluded while Genesis remains playable',async()=>{
 const pets=await readOwnedPets(A,undefined,fixture({generation:0}).rpc);
 assert.deepEqual(pets.map(p=>p.collection),['Genesis']);
});
test('aborted ownership work cannot deliver pets',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(readOwnedPets(A,controller.signal,fixture().rpc),{name:'AbortError'});
});
test('buffs use verified collection and scenery without stacking',()=>{
 const genesis=parsePet(COLLECTIONS[0],7n,0,uri),generations=parsePet(COLLECTIONS[1],7n,1,uri);
 assert.equal(battleEfficiency(genesis,'Garden'),1.1);assert.equal(battleEfficiency(genesis,'Coastal'),1.1);
 assert.equal(battleEfficiency(generations,'Coastal'),1.1);assert.equal(battleEfficiency(generations,'Garden'),1);
 assert.equal(battleEfficiency({...generations,land:undefined},'Garden'),1);
});
