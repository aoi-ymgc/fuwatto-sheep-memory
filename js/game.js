import { createGameDeck, DIFFICULTIES } from "./deck.js";

export const RANK_THRESHOLDS = {
  easy:[{rank:"S",time:52,flips:18},{rank:"A",time:85,flips:26},{rank:"B",time:125,flips:40}],
  normal:[{rank:"S",time:100,flips:30},{rank:"A",time:155,flips:44},{rank:"B",time:230,flips:68}],
  hard:[{rank:"S",time:170,flips:48},{rank:"A",time:260,flips:70},{rank:"B",time:390,flips:105}],
  full:[{rank:"S",time:280,flips:72},{rank:"A",time:420,flips:102},{rank:"B",time:630,flips:155}]
};
export const formatTime = seconds => `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
export const getRank = (difficulty,time,flips) => (RANK_THRESHOLDS[difficulty].find(level => time<=level.time && flips<=level.flips)?.rank || "C");

export class MemoryGame {
  constructor({onChange,onMessage,onComplete,onSound,difficulty="normal"}) { this.onChange=onChange;this.onMessage=onMessage;this.onComplete=onComplete;this.onSound=onSound;this.timer=null;this.disposed=false;this.pendingTimeouts=new Set();this.reset(difficulty); }
  reset(difficulty) { this.stopTimer();this.difficulty=difficulty;this.cards=createGameDeck(difficulty).map(card=>({...card,state:"face-down"}));this.selectedCards=[];this.matchedCards=new Set();this.flipCount=0;this.elapsedTime=0;this.matchStreak=0;this.missStreak=0;this.gameStatus="ready";this.isLocked=false;this.emitChange(); }
  snapshot(){return {cards:this.cards,difficulty:this.difficulty,pairs:DIFFICULTIES[this.difficulty].pairs,selectedCards:this.selectedCards,matchedCards:this.matchedCards,flipCount:this.flipCount,elapsedTime:this.elapsedTime,matchStreak:this.matchStreak,missStreak:this.missStreak,gameStatus:this.gameStatus,isLocked:this.isLocked};}
  emitChange(){if(!this.disposed)this.onChange(this.snapshot())}
  emitSound(name){if(!this.disposed)this.onSound(name)}
  start(){if(this.disposed)return;this.gameStatus="playing";this.startTimer();this.emitChange();}
  startTimer(){this.stopTimer();this.timer=setInterval(()=>{if(!this.disposed&&this.gameStatus==="playing"){this.elapsedTime++;this.emitChange();}},1000)}
  stopTimer(){if(this.timer){clearInterval(this.timer);this.timer=null}}
  dispose(){if(this.disposed)return;this.disposed=true;this.stopTimer();for(const pending of this.pendingTimeouts){clearTimeout(pending.id);pending.resolve(false)}this.pendingTimeouts.clear();this.selectedCards=[];this.isLocked=true;}
  pause(){if(this.disposed||this.gameStatus!=="playing")return;this.gameStatus="paused";this.emitChange()}
  resume(){if(this.disposed||this.gameStatus!=="paused")return;this.gameStatus="playing";this.emitChange()}
  async select(id){
    if(this.disposed||this.gameStatus!=="playing"||this.isLocked)return;
    const current=this.cards.find(card=>card.id===id);
    if(!current||current.state!=="face-down")return;
    current.state="face-up";this.selectedCards.push(current);this.flipCount++;this.emitSound("flip");this.emitChange();
    if(this.selectedCards.length<2)return;
    this.isLocked=true;this.emitChange();
    if(!await this.wait(300)||this.disposed)return;
    const [first,second]=this.selectedCards;
    if(!first||!second)return;
    if(first.pairId===second.pairId){
      first.state=second.state="matched";this.matchedCards.add(first.id);this.matchedCards.add(second.id);const joker=first.pairId==="joker";this.matchStreak++;this.missStreak=0;const level=joker?3:Math.min(this.matchStreak,3);this.selectedCards=[];this.isLocked=false;this.emitChange();this.emitSound(joker?"joker":"match");if(!this.disposed)this.onMessage({kind:joker?"joker":"match",level,streak:this.matchStreak,cardIds:[first.id,second.id],text:joker?"JOKER MATCH!":level===3?`AMAZING! ${this.matchStreak} COMBO!`:level===2?"NICE! 2 COMBO!":"MATCH!"});
      if(this.matchedCards.size===this.cards.length){this.complete();}
    }else{
      this.missStreak++;this.matchStreak=0;const level=Math.min(this.missStreak,3);this.emitSound("miss");if(!this.disposed)this.onMessage({kind:"miss",level,streak:this.missStreak,cardIds:[first.id,second.id],text:level===3?`KEEP TRYING! ${this.missStreak} MISS`:level===2?"OOPS… 2 MISS":"MISS"});if(!await this.wait(680)||this.disposed)return;first.state=second.state="returning";this.emitChange();if(!await this.wait(300)||this.disposed)return;first.state=second.state="face-down";this.selectedCards=[];this.isLocked=false;this.emitChange();
    }
  }
  complete(){if(this.disposed||this.gameStatus==="completed")return;this.gameStatus="completed";this.stopTimer();const result={difficulty:this.difficulty,time:this.elapsedTime,flips:this.flipCount,rank:getRank(this.difficulty,this.elapsedTime,this.flipCount)};this.emitChange();this.emitSound("clear");this.wait(360).then(isCurrent=>{if(isCurrent&&!this.disposed)this.onComplete(result)});}
  wait(ms){if(this.disposed)return Promise.resolve(false);return new Promise(resolve=>{const pending={id:null,resolve};pending.id=setTimeout(()=>{this.pendingTimeouts.delete(pending);resolve(!this.disposed)},ms);this.pendingTimeouts.add(pending)});}
}
