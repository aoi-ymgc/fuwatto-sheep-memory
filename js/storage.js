const KEY="fuwatto-sheep-memory-best-v1";
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
export const getBest = difficulty => read()[difficulty] || null;
export const saveBest = (difficulty,score) => {
  const all=read(), before=all[difficulty];
  const isBest=!before || score.time<before.time || score.flips<before.flips;
  if(isBest){all[difficulty]={time:Math.min(score.time,before?.time ?? Infinity),flips:Math.min(score.flips,before?.flips ?? Infinity)};try{localStorage.setItem(KEY,JSON.stringify(all))}catch{}}
  return {isBest,best:all[difficulty]};
};
