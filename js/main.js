import { DIFFICULTIES, preloadCards } from "./deck.js";
import { MemoryGame, formatTime } from "./game.js";
import { getBest, saveBest } from "./storage.js";
import { sound } from "./sound.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const board=$("[data-board]"),message=$("[data-message]"),top=$("#top"),play=$("#game");
let selectedDifficulty="normal",activeGame=null, messageTimeout,gameSession=0,feedbackCardIds=[];

const cardMarkup=(card,isLocked)=>{
  const isFaceDown=card.state==="face-down";
  const stateLabel=isFaceDown?"裏向きのカード":`${card.label}、${card.state==="matched"?"ペア成立済み":"表向き"}`;
  const stateClass=card.state==="returning"?"is-returning":!isFaceDown?"is-face-up":"";
  return `<button class="memory-card ${stateClass} ${card.state==="matched"?"is-matched":""}" type="button" data-card-id="${card.id}" aria-label="${stateLabel}" ${card.state==="matched"||isLocked?"disabled":""}><span class="card-inner"><span class="card-face card-back"><img src="./assets/card-back.svg" alt="" aria-hidden="true"></span><span class="card-face card-front"><img src="${card.image}" alt="" aria-hidden="true"></span></span></button>`;
};
const syncCard=({id,state},isLocked)=>{
  const card=board.querySelector(`[data-card-id="${id}"]`);if(!card)return;
  const isFaceDown=state==="face-down";
  const source=activeGame?.cards.find(item=>item.id===id);
  const feedbackClasses=[...card.classList].filter(className=>className.startsWith("feedback-"));
  const stateClass=state==="returning"?"is-returning":!isFaceDown?"is-face-up":"";
  const baseClass=`memory-card ${stateClass} ${state==="matched"?"is-matched":""}`.trim();
  if([...card.classList].filter(className=>!className.startsWith("feedback-")).join(" ")!==baseClass)card.className=`${baseClass} ${feedbackClasses.join(" ")}`;
  card.disabled=state==="matched"||isLocked;
  card.setAttribute("aria-label",isFaceDown?"裏向きのカード":`${source?.label||"カード"}、${state==="matched"?"ペア成立済み":"表向き"}`);
};
const render=state=>{
  board.dataset.count=state.cards.length;board.style.setProperty("--columns",window.innerWidth<=760?4:(state.cards.length===16?4:6));
  const deckKey=state.cards.map(card=>card.id).join("|");
  if(board.dataset.deckKey!==deckKey){board.dataset.deckKey=deckKey;board.innerHTML=state.cards.map(card=>cardMarkup(card,state.isLocked)).join("");}
  else state.cards.forEach(card=>syncCard(card,state.isLocked));
  $("[data-stat=time]").textContent=formatTime(state.elapsedTime);$("[data-stat=flips]").textContent=state.flipCount;$("[data-stat=matches]").textContent=`${state.matchedCards.size/2} / ${state.pairs}`;
  document.body.classList.toggle("is-paused",state.gameStatus==="paused");
};
const clearFeedback=()=>{
  const feedbackClasses=["feedback-match","feedback-miss","feedback-joker","feedback-level-1","feedback-level-2","feedback-level-3"];
  message.classList.remove("is-showing",...feedbackClasses);board.classList.remove(...feedbackClasses);
  feedbackCardIds.forEach(id=>board.querySelector(`[data-card-id="${id}"]`)?.classList.remove(...feedbackClasses));
  feedbackCardIds=[];
};
const showMessage=feedback=>{
  clearTimeout(messageTimeout);clearFeedback();
  message.textContent=feedback.text;message.dataset.kind=feedback.kind;message.dataset.level=feedback.level;
  const kindClass=`feedback-${feedback.kind}`,levelClass=`feedback-level-${feedback.level}`;
  void message.offsetWidth;message.classList.add("is-showing",kindClass,levelClass);board.classList.add(kindClass,levelClass);
  feedbackCardIds=[...feedback.cardIds];feedbackCardIds.forEach(id=>board.querySelector(`[data-card-id="${id}"]`)?.classList.add(kindClass,levelClass));
  messageTimeout=setTimeout(clearFeedback,feedback.level===3?1000:780);
};
const openModal=name=>{const modal=$(`[data-modal="${name}"]`);if(modal&&!modal.open)modal.showModal()};
const closeModals=()=>$$("dialog[open]").forEach(modal=>modal.close());
const updateBestSummary=()=>{const best=getBest(selectedDifficulty),label=DIFFICULTIES[selectedDifficulty].label;$("[data-best-label]").textContent=label;$("[data-best-summary]").textContent=best?`${formatTime(best.time)} / ${best.flips} FLIPS`:"--:-- / -- FLIPS"};
const setDifficulty=difficulty=>{$$("[data-difficulty]").forEach(button=>button.setAttribute("aria-checked",String(button.dataset.difficulty===difficulty)));selectedDifficulty=difficulty;updateBestSummary()};
const showScreen=name=>{top.classList.toggle("is-active",name==="top");play.classList.toggle("is-active",name==="game")};
const startGame=async()=>{
  const session=++gameSession;
  clearTimeout(messageTimeout);clearFeedback();closeModals();showScreen("game");
  window.scrollTo({top:0,behavior:"auto"});
  activeGame?.dispose();
  let game;
  const isCurrent=()=>session===gameSession&&activeGame===game&&!game.disposed;
  game=new MemoryGame({difficulty:selectedDifficulty,onChange:state=>{if(isCurrent())render(state)},onMessage:feedback=>{if(isCurrent())showMessage(feedback)},onSound:key=>{if(isCurrent())sound[key]()},onComplete:result=>{
    if(!isCurrent())return;
    const {isBest}=saveBest(result.difficulty,result);$("[data-new-record]").hidden=!isBest;$("[data-result=rank]").textContent=result.rank;$("[data-result=difficulty]").textContent=DIFFICULTIES[result.difficulty].label;$("[data-result=time]").textContent=formatTime(result.time);$("[data-result=flips]").textContent=result.flips;openModal("result");
  }});
  activeGame=game;render(game.snapshot());
  board.setAttribute("aria-busy","true");await preloadCards(game.cards);
  if(!isCurrent())return;
  board.removeAttribute("aria-busy");game.start();
};
const goTop=()=>{++gameSession;clearTimeout(messageTimeout);clearFeedback();closeModals();activeGame?.dispose();activeGame=null;board.removeAttribute("aria-busy");showScreen("top");updateBestSummary();window.scrollTo({top:0,behavior:"smooth"})};

document.addEventListener("click",event=>{
  const card=event.target.closest("[data-card-id]");if(card){activeGame?.select(card.dataset.cardId);return}
  const difficulty=event.target.closest("[data-difficulty]");if(difficulty){setDifficulty(difficulty.dataset.difficulty);sound.click();return}
  const action=event.target.closest("[data-action]")?.dataset.action;if(!action)return;
  if(action!=="toggle-sound")sound.click();
  if(action==="start-game"||action==="play-again")startGame();
  if(action==="go-top")goTop();
  if(action==="open-howto")openModal("howto");
  if(action==="close-modal")event.target.closest("dialog").close();
  if(action==="pause"){activeGame?.pause();openModal("pause")}
  if(action==="resume"){$("[data-modal=pause]").close();activeGame?.resume()}
  if(action==="toggle-sound"){const on=sound.toggle();const button=$("[data-action=toggle-sound]");button.textContent=`SOUND ${on?"ON":"OFF"}`;button.setAttribute("aria-pressed",String(on))}
});
$("[data-modal=pause]").addEventListener("close",()=>{if(activeGame?.gameStatus==="paused")activeGame.resume()});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!$("dialog[open]")&&activeGame?.gameStatus==="playing"){activeGame.pause();openModal("pause")}});
window.addEventListener("resize",()=>{if(activeGame){delete board.dataset.renderKey;render(activeGame.snapshot())}});
setDifficulty("normal");updateBestSummary();
