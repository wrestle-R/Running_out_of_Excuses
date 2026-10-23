import {describe,it,expect,vi} from "vitest";
vi.mock("@/lib/db",()=>({prisma:{}}));
import repertoire from "./repertoire.json";
import catalogue from "./song-catalogue.json";
import {validateSessionAction,makeQuizOptions} from "./sessionService";
import {InvalidQuiz} from "./guitarService";
const id="f1826582-b56c-4504-9710-32fb08995915";
describe("server-timed quiz actions",()=>{
  it("gives every playable song four choices without ambiguous identical titles",()=>{
    for(const id of repertoire.versions.v4){
      const options=makeQuizOptions(id);
      expect(options).toHaveLength(4);expect(new Set(options).size).toBe(4);expect(options).toContain(id);
      expect(new Set(options.map(option=>catalogue.find(song=>song.id===option)!.title.toLowerCase().split('(')[0].trim())).size).toBe(4);
    }
  });
  it("accepts only question progress and an answer ID",()=>{
    expect(validateSessionAction(id,{questionNumber:1,answerId:"shape"},true)).toEqual({questionNumber:1,answerId:"shape"});
    expect(validateSessionAction(id,{questionNumber:1})).toEqual({questionNumber:1,answerId:undefined});
  });
  it("rejects all attempts to supply a time, score or question pool",()=>{
    for(const key of ["elapsedMs","startedAt","score","questions","questionStartedAt"])expect(()=>validateSessionAction(id,{questionNumber:1,answerId:"shape",[key]:0},true)).toThrow(InvalidQuiz);
  });
  it.each([null,{},[],{questionNumber:0},{questionNumber:11},{questionNumber:1.5},{questionNumber:1,answerId:7}])("rejects malformed answer actions: %j",body=>{
    expect(()=>validateSessionAction(id,body,true)).toThrow(InvalidQuiz);
  });
});
