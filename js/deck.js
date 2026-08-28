export const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
export const DIFFICULTIES = { easy:{label:"EASY",pairs:8}, normal:{label:"NORMAL",pairs:12}, hard:{label:"HARD",pairs:18}, full:{label:"FULL DECK",pairs:27} };
const SUITS = [{key:"S",name:"スペード",color:"black",symbol:"♠"},{key:"C",name:"クラブ",color:"black",symbol:"♣"},{key:"H",name:"ハート",color:"red",symbol:"♥"},{key:"D",name:"ダイヤ",color:"red",symbol:"♦"}];
const CARD_ASSET_VERSION = "20260824-03";
const rankName = rank => ({A:"Ace",J:"Jack",Q:"Queen",K:"King"}[rank] || rank);
export const shuffle = cards => { const result=[...cards]; for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];} return result; };
const card = (suit,rank) => ({ id:`${suit.key}-${rank}`,suit:suit.key,rank,color:suit.color,pairId:`${suit.color}-${rank}`,image:`./assets/card-images/${suit.key}_${rank}.webp?v=${CARD_ASSET_VERSION}`,label:`${suit.name}の${rankName(rank)}` });
export const createDeck = () => [
  ...SUITS.flatMap(suit => RANKS.map(rank => card(suit,rank))),
  {id:"joker-1",suit:"JOKER",rank:"JOKER",color:"joker",pairId:"joker",image:`./assets/card-images/JOKER_1.webp?v=${CARD_ASSET_VERSION}`,label:"Joker 1"},
  {id:"joker-2",suit:"JOKER",rank:"JOKER",color:"joker",pairId:"joker",image:`./assets/card-images/JOKER_2.webp?v=${CARD_ASSET_VERSION}`,label:"Joker 2"}
];
export const createGameDeck = difficulty => {
  const pairs = new Map();
  createDeck().forEach(cardItem => { if(!pairs.has(cardItem.pairId)) pairs.set(cardItem.pairId,[]); pairs.get(cardItem.pairId).push(cardItem); });
  const selected = shuffle([...pairs.values()]).slice(0,DIFFICULTIES[difficulty].pairs).flat();
  return shuffle(selected);
};
export const preloadCards = cards => Promise.all(cards.map(({image}) => new Promise(resolve => {
  const img=new Image();
  const complete=()=>img.decode?img.decode().catch(()=>{}).finally(resolve):resolve();
  img.onload=complete;img.onerror=resolve;img.src=image;
})));
