import { generateTeamProfilePdf } from "./lib/generateTeamProfilePdf";
import type { TeamPdfData } from "./lib/assembleTeamPdfData";

const FACETS = [
 ["Need to trust others","Protection"],["Curiosity (professional)","Prediction"],["Need for status","Participation"],
 ["Fear of failure","Protection"],["Need for control","Prediction"],["Openness to change","Prediction"],
 ["Need for belonging","Participation"],["Tolerance of ambiguity","Prediction"],["Need for recognition","Participation"],
 ["Risk appetite","Protection"],["Need for fairness","Participation"],["Need for autonomy","Protection"],
];
const SHAPES = ["Everyone high","Everyone low","Two groups","Even spread","Together (mid)"];
const rnd = (i:number)=>Array.from({length:10},(_,j)=>((i*37+j*13)%90)+5);
const mk = (i:number)=>({itemNumber:i+1,facetName:FACETS[i%FACETS.length][0],shape:SHAPES[i%5],domain:FACETS[i%FACETS.length][1],driverScore:60});
const all = Array.from({length:41},(_,i)=>mk(i));
const scores = new Map<number,number[]>(all.map((f,i)=>[f.itemNumber,rnd(i)]));
const itemText = new Map<number,string>(all.map((f)=>[f.itemNumber,`How do you 'score' yourself on the degree to which you need to ${f.facetName.toLowerCase()} in situations that matter to you at work?`]));
const lorem=(n:number)=>Array.from({length:n},()=>"The team leans hard on the same handful of habits under pressure and that shows up in how decisions land.").join(" ");
const data: TeamPdfData = {
  teamName:"Symbiokinetics", memberCount:10,
  domains:{Protection:{mean:62,high:88,low:31},Participation:{mean:55,high:80,low:22},Prediction:{mean:70,high:92,low:44}},
  strengths: all.slice(0,3), focusAreas: all.slice(3,6), fullMap: all,
  scoresByItem: scores, itemText,
  sections:{
    team_in_three:[1,2,3].map(i=>({headline:`Headline number ${i} about the team`,detail:lorem(2),action:"Try this in your next meeting.",facets:[all[i].facetName]})),
    driving_facets:{opening:lorem(2),
      strengths:[1,2,3].map(i=>({item:i,why:lorem(2),actions:["Continue naming the trade-off out loud before the group commits to anything that will be hard to reverse later","Keep the check short"]})),
      focus:[4,5,6].map(i=>({item:i,why:lorem(2),actions:["Continue naming the trade-off out loud before the group commits to anything that will be hard to reverse later"]}))},
    communication:{general:[{point:"They talk fast",body:lorem(2),facets:[all[0].facetName]}] as any,under_pressure:[{point:"It narrows",body:lorem(2)}] as any,avoid_conflict:[{point:"Silence",body:lorem(1)}] as any},
    conflict:{summary:lorem(3),mitigate:[{point:"Slow it",body:lorem(2)}] as any,promote_healthy:[{point:"Name it",body:lorem(2)}] as any},
    leadership:[1,2,3].map(i=>({headline:`Leader headline ${i}`,detail:lorem(2),action:"Do this first.",facets:[all[i].facetName,all[i+1].facetName]})),
    leader_brief:{rows:[1,2,3,4,5].map(i=>({item:i,risk_to_work:lorem(1),the_move:lorem(1),potential_owner:"Team lead"})),lean_on:lorem(1)},
    coach:{why:[1,2,3,4,5,6].map(i=>({item:i,rationale:lorem(2)})),debrief_prompts:["What did you notice?","Where did it bite?"]},
  },
};
const sections = {teamInThree:true,domains:true,shapeLegend:true,driving:true,drivingFacetCharts:true,communication:true,conflict:true,leadership:true,leaderBrief:true,fullMap:true,fullMapCharts:true,coach:true};

export async function run(withScores: boolean) {
  const d = { ...data, scoresByItem: withScores ? scores : new Map() };
  await generateTeamProfilePdf(d as any, sections);
}
