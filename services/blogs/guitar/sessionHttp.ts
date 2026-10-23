import { jsonResponse } from "@/lib/server/http";
import { InvalidQuiz, RunConflict } from "./guitarService";
import { SessionUnavailable } from "./sessionService";
export async function readQuizAction(request:Request) {
  const reader=request.body?.getReader();if(!reader)throw new InvalidQuiz();
  const decoder=new TextDecoder();let body="",bytes=0;
  try{for(;;){const{done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1024){await reader.cancel();throw new InvalidQuiz();}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}finally{reader.releaseLock();}
  return JSON.parse(body) as unknown;
}
export async function quizResponse(action:()=>Promise<unknown>) {
  const headers={"Cache-Control":"no-store"};
  try{return jsonResponse(await action(),{headers});}
  catch(error){
    if(error instanceof InvalidQuiz||error instanceof SyntaxError)return jsonResponse({error:"Invalid quiz action"},{status:400,headers});
    if(error instanceof RunConflict)return jsonResponse({error:"This question already has a different answer"},{status:409,headers});
    if(error instanceof SessionUnavailable)return jsonResponse({error:"This quiz expired. Please start again."},{status:404,headers});
    console.error("Guitar quiz action failed");
    return jsonResponse({error:"Could not save this quiz action. Please try again."},{status:503,headers});
  }
}
