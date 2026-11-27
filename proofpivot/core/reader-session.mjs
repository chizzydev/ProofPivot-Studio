// Server-owned response deadline; no answer or arm information in session status.
import{PROTOCOL}from'./protocol.mjs';
export const EXPIRED_MESSAGE='This reading session expired before your answer was submitted. Your answer was not recorded. Restart the reading task in practice mode to try again.';
export const READ_REQUIRED_MESSAGE='Please read the correction before submitting your answer. Your answer has not been recorded.';
export function readerSession(participant,answer,now){
 const expires_at=participant?.exposed_at==null?null:participant.exposed_at+PROTOCOL.response_window_ms;
 const status=answer?'RECORDED':!participant||participant.quarantined?'UNAVAILABLE':expires_at===null?'AWAITING_EXPOSURE':now>=expires_at?'EXPIRED':'ACTIVE';
 return{status,server_now:now,exposed_at:participant?.exposed_at??null,expires_at,response_window_ms:PROTOCOL.response_window_ms};
}
export function responseError(session){const e=Error(session.status==='EXPIRED'?EXPIRED_MESSAGE:READ_REQUIRED_MESSAGE);e.code=session.status==='EXPIRED'?'SESSION_EXPIRED':'READ_REQUIRED';e.session=session;return e;}
