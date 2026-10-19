"use strict";var ie=Object.create;var H=Object.defineProperty;var ae=Object.getOwnPropertyDescriptor;var re=Object.getOwnPropertyNames;var ce=Object.getPrototypeOf,le=Object.prototype.hasOwnProperty;var de=(g,e)=>{for(var t in e)H(g,t,{get:e[t],enumerable:!0})},Z=(g,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of re(e))!le.call(g,o)&&o!==t&&H(g,o,{get:()=>e[o],enumerable:!(s=ae(e,o))||s.enumerable});return g};var $=(g,e,t)=>(t=g!=null?ie(ce(g)):{},Z(e||!g||!g.__esModule?H(t,"default",{value:g,enumerable:!0}):t,g)),pe=g=>Z(H({},"__esModule",{value:!0}),g);var ye={};de(ye,{activate:()=>ge,deactivate:()=>fe});module.exports=pe(ye);var x=$(require("vscode")),K=$(require("path")),O=$(require("fs"));var m=$(require("vscode")),u=$(require("path")),w=$(require("fs"));var S=$(require("fs/promises")),T=$(require("path"));var ee=$(require("fs/promises")),A=$(require("path")),z=class{constructor(e,t="agent",s="analysis"){this.workspaceRoot=e;this.promptsDir=t;this.analysisDir=s}setWorkspaceRoot(e){this.workspaceRoot=e||""}async readFileSafe(e){try{if(!this.workspaceRoot&&!A.isAbsolute(e))return"";let t=A.isAbsolute(e)?e:A.join(this.workspaceRoot,e);return await ee.readFile(t,"utf-8")}catch{return""}}async buildPhaseContext(e){let t=this.promptsDir,s=await this.readFileSafe(A.join(t,"PROTOCOL.md"));if(!s&&t==="agent"){let E=await this.readFileSafe(A.join("prompts","PROTOCOL.md"));E&&(t="prompts",s=E)}if(!s){let E=await this.readFileSafe(".clinerules"),M=await this.readFileSafe(A.join(t,"INSTRUCT.md"));s=`${E}

${M}`.trim()}let o=await this.readFileSafe(A.join(t,"SKILL.md")),n=await this.readFileSafe(A.join("docs","experiment.md")),i=await this.readFileSafe(A.join(t,"VARIABLES.md"));i||(i=n||"No dataset parameters provided. See docs/experiment.md.");let a=await this.readFileSafe(A.join(t,"BIOLOGY.md")),l=a?`

# CURATED DOMAIN BIOLOGICAL CONTEXT
${a}`:"",h=`
# AUTONOMOUS ANALYSIS PROTOCOL & QUALITY GATES
${s}

# INPUT DATASET PARAMETERS & EXPERIMENT SPECIFICATION
${i}
${l}

# DOMAIN SKILL SPECIFICATION & API CONVENTIONS
${o}
`.trim(),p=await this.readFileSafe(A.join("docs","notes.md")),r=await this.readFileSafe(A.join("docs","llm.md")),c=`
## CURRENT RUNTIME STATE (Shared Memory)
### docs/notes.md:
${p||"No prior execution notes found. Initialize if this is Phase 0 or Phase 1."}

### docs/llm.md (ACTIVE MODEL & AGENT SPECIFICATION - READ ONLY):
${r||"No active model summary found."}

### docs/experiment.md (USER EXPERIMENT & DATASET SPECIFICATION - READ ONLY):
${n||"No user experiment design provided. Note: This file is strictly user-maintained; do not create or overwrite it."}
`.trim(),f=e;!e.includes("/")&&!e.includes("\\")&&(f=A.join(this.analysisDir,e));let v=await this.readFileSafe(f),y=h,I=A.basename(e).replace(/\.md$/,"").toUpperCase(),P=`
${c}

---

## ACTIVE PHASE DIRECTIVE (${e})
${v}

### Execution Instructions:
- Adhere strictly to the guidelines and gate checkpoints for this phase.
- Execute code and commands to make real progress.
- For scripts and documents under 150 lines, always write or overwrite the full file using 'write_file'.
- When authoring or updating any report or document (e.g. in docs/), reference 'docs/llm.md' and place the metadata header immediately beneath the title:
  Title

  Created: YYYY-MM-DD HH:MM
  Author: PROVIDER | LLM-MODEL
  Agent: TidyProteomicsAgent vX.X.X
- Once all checkpoints for this phase are satisfied and verified, invoke complete_phase(phaseName = "${I}", summary = "...").
`.trim();return{systemPrompt:y,phasePrompt:P,blackboardState:c,staticPrefixForCache:h}}};var V=class{constructor(e,t,s,o,n,i,a,l){this.phaseName=e;this.phaseTitle=t;this.client=s;this.tools=o;this.context=n;this.onProgress=i;this.chatLogger=a;this.isCancelled=l}messages=[];totalUsage={promptTokens:0,completionTokens:0,totalTokens:0,cachedPromptTokens:0};getTotalUsage(){return{...this.totalUsage}}async run(e=25){let t=Date.now();if(this.messages.push({role:"user",content:this.context.phasePrompt}),this.chatLogger){let a=this.client.getConfig();await this.chatLogger.logPhaseStart({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,model:a.model,provider:a.provider,systemPromptFiles:["agent/PROTOCOL.md","docs/experiment.md","agent/SKILL.md"],inputPromptFiles:[this.phaseName.includes("/")?this.phaseName:`analysis/${this.phaseName}`,"docs/notes.md","docs/llm.md","docs/experiment.md"]})}let s=0,o="";for(;s<e;){if(this.isCancelled&&this.isCancelled()){let r="Execution stopped by user.";if(this.chatLogger){let c=Math.round((Date.now()-t)/1e3);await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:r,durationSeconds:c,tokensUsed:this.totalUsage,turnCount:s})}return{success:!1,summary:r,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}s++,this.onProgress({type:"thought",data:`Starting Turn ${s}/${e}...`});let a,l=2,h=0,p=null;for(;h<=l&&(h++,!(this.isCancelled&&this.isCancelled()));)try{a=await this.client.chat({system:this.context.systemPrompt,messages:this.messages,tools:this.tools.getDefinitions(),onToken:r=>{this.onProgress({type:"text",data:r})}}),p=null;break}catch(r){if(p=r,(r.name==="TimeoutError"||r.name==="AbortError"||/timeout|aborted|ETIMEDOUT|ECONNRESET/i.test(r.message||""))&&h<=l&&(!this.isCancelled||!this.isCancelled())){let f=h*3e3;this.onProgress({type:"thought",data:`\u26A0\uFE0F Turn ${s} timed out on attempt ${h}/${l+1} (${r.message}). Retrying in ${f/1e3}s...`}),await new Promise(v=>setTimeout(v,f));continue}break}if(!a){let r=p?`LLM API Error during turn ${s}: ${p.message}`:"Execution stopped by user.";if(this.chatLogger){let c=Math.round((Date.now()-t)/1e3);await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:r,durationSeconds:c,tokensUsed:this.totalUsage,turnCount:s})}return{success:!1,summary:r,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}if(this.totalUsage.promptTokens+=a.usage.promptTokens,this.totalUsage.completionTokens+=a.usage.completionTokens,this.totalUsage.totalTokens+=a.usage.totalTokens,this.totalUsage.cachedPromptTokens=(this.totalUsage.cachedPromptTokens||0)+(a.usage.cachedPromptTokens||0),this.onProgress({type:"tokens",data:{turn:s,turnUsage:a.usage,totalUsage:{...this.totalUsage}}}),this.messages.push({role:"assistant",content:a.content,tool_calls:a.tool_calls}),this.chatLogger&&await this.chatLogger.logAssistantResponse(s,a.content,a.tool_calls,a.usage),a.truncationDetected){let r=`\u26A0\uFE0F Output limit reached (finish_reason: "${a.finishReason||"length"}", tokens: ${a.usage.completionTokens}). Generation was truncated.`;this.onProgress({type:"thought",data:r}),this.chatLogger&&await this.chatLogger.logTruncationWarning(s,a.finishReason||"length",a.usage.completionTokens)}if(a.tool_calls&&a.tool_calls.length>0)for(let r of a.tool_calls){this.onProgress({type:"tool_start",data:{name:r.name,args:r.args}});let c=await this.tools.execute(r.name,r.args);this.onProgress({type:"tool_end",data:{name:r.name,result:c.content,isError:c.isError}});let f=c.content;if(f&&f.length>24e3){let y=f.slice(0,12e3),I=f.slice(-1e4),P=f.length-22e3;f=`${y}

... [\u26A0\uFE0F Output truncated: ${P.toLocaleString()} characters omitted to preserve context economy. See complete output in workspace/logs/ or inspect with 'read_file'] ...

${I}`}if(this.messages.push({role:"tool",tool_call_id:r.id,tool_name:r.name,content:f}),this.chatLogger&&await this.chatLogger.logToolResult(r.name,r.id,c.content,c.isError),r.name==="complete_phase"){o=r.args.summary||a.content;let y=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!0,summary:o,durationSeconds:y,tokensUsed:this.totalUsage,turnCount:s}),{success:!0,summary:o,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}}else if(a.content.includes("PHASE_COMPLETED")||a.content.includes("CHECKPOINT_PASSED")){let r=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!0,summary:a.content,durationSeconds:r,tokensUsed:this.totalUsage,turnCount:s}),{success:!0,summary:a.content,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}else a.truncationDetected?this.messages.push({role:"user",content:`[System Notice]: Your response reached the maximum output token limit (finish_reason: "${a.finishReason||"length"}", completion tokens: ${a.usage.completionTokens}). Any attempted tool call was truncated before completion and could not be parsed. Please write the output in smaller sections or verify that Max Output Tokens in settings is set sufficiently high.`}):this.messages.push({role:"user",content:"Please execute the required tools to fulfill the objectives of this phase, or call complete_phase when finished."})}let n=`Turn limit reached (${e} turns) without completing phase checkpoints.`,i=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:n,durationSeconds:i,tokensUsed:this.totalUsage,turnCount:e}),{success:!1,summary:n,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:e}}};var G=$(require("fs/promises")),F=$(require("path")),q=class{constructor(e,t="logs/llm_chat.md"){this.workspaceRoot=e;this.workspaceRoot=e||"",this.logPath=this.resolveLogPath(t)}logPath;writeQueue=Promise.resolve();setWorkspaceRoot(e){this.workspaceRoot=e||"",this.logPath=this.resolveLogPath("logs/llm_chat.md")}getLogPath(){return this.logPath}resolveLogPath(e){return F.isAbsolute(e)?e:this.workspaceRoot?F.join(this.workspaceRoot,e):""}async append(e){if(!(!this.workspaceRoot||!this.logPath))return this.writeQueue=this.writeQueue.then(async()=>{try{let t=F.dirname(this.logPath);await G.mkdir(t,{recursive:!0}),await G.appendFile(this.logPath,e+`
`,"utf-8")}catch(t){console.error(`[ChatLogger] Failed to write to ${this.logPath}:`,t)}}),this.writeQueue}async logPhaseStart(e){let t=new Date().toISOString(),s=e.systemPromptFiles||["agent/PROTOCOL.md","docs/experiment.md","agent/SKILL.md"],o=e.inputPromptFiles||[e.phaseFileName.includes("/")?e.phaseFileName:`analysis/${e.phaseFileName}`,"docs/notes.md","docs/llm.md","docs/experiment.md"],n=["","---","",`# [${t}] \u{1F680} Phase Start: ${e.phaseTitle}`,`- **Phase File**: \`${e.phaseFileName}\``,`- **Model**: \`${e.model}\` | **Provider**: \`${e.provider}\``,"","### \u2699\uFE0F Persistent System Frame (Sent & Cached Prefix)",...s.map(i=>`- \`${i}\``),"","### \u{1F4E5} Input Prompts & Blackboard Directives (Turn 1)",...o.map(i=>`- \`${i}\``),""];await this.append(n.join(`
`))}async logAssistantResponse(e,t,s,o){let i=[`### [${new Date().toISOString()}] \u{1F916} Assistant (Turn ${e})`];if(t&&t.trim().length>0&&(i.push(""),i.push(t.trim())),s&&s.length>0){i.push(""),i.push("**Tool Calls**:");for(let a of s)i.push(`- **\`${a.name}\`** (id: \`${a.id}\`)`),i.push("  ```json"),i.push(JSON.stringify(a.args,null,2).split(`
`).map(l=>`  ${l}`).join(`
`)),i.push("  ```")}if(o){let a=o.cachedPromptTokens||0;i.push(""),i.push(`> **Metrics**: Turn Tokens: **${o.totalTokens.toLocaleString()}** (Prompt: ${o.promptTokens.toLocaleString()}, Completion: ${o.completionTokens.toLocaleString()}, Cached: ${a.toLocaleString()})`)}i.push(""),await this.append(i.join(`
`))}async logTruncationWarning(e,t,s){let o=new Date().toISOString(),n=[`> \u26A0\uFE0F **WARNING (Turn ${e})**: Generation hit output token limit (\`finish_reason: "${t}"\`, completion tokens: **${s.toLocaleString()}**). Response or pending tool calls were truncated mid-stream!`,""];await this.append(n.join(`
`))}async logToolResult(e,t,s,o){let n=new Date().toISOString(),i=o?"\u274C ERROR":"\u2705 SUCCESS",a=s?s.trim():"(No output)",l=[`#### [${n}] \u{1F527} Tool Result: \`${e}\` [${i}] (id: \`${t}\`)`,"```",a,"```",""];await this.append(l.join(`
`))}async logPhaseEnd(e){let t=new Date().toISOString(),s=e.success?"\u2705":"\u274C",o=e.success?"COMPLETED":"FAILED",n=e.tokensUsed.cachedPromptTokens||0,i=[`### [${t}] ${s} Phase ${o}: ${e.phaseTitle}`,`- **Duration**: ${e.durationSeconds}s | **Total Turns**: ${e.turnCount}`,`- **Cumulative Tokens**: Total: **${e.tokensUsed.totalTokens.toLocaleString()}** | Prompt: ${e.tokensUsed.promptTokens.toLocaleString()} | Completion: ${e.tokensUsed.completionTokens.toLocaleString()} | Cached: ${n.toLocaleString()}`,"","**Summary**:",e.summary,"","---",""].join(`
`);await this.append(i)}};var D=$(require("fs/promises")),X=$(require("path"));function he(g=new Date){let e=a=>a.toString().padStart(2,"0"),t=g.getFullYear(),s=e(g.getMonth()+1),o=e(g.getDate()),n=e(g.getHours()),i=e(g.getMinutes());return`${t}-${s}-${o} ${n}:${i}`}function ue(g,e="0.1.0",t=new Date){let s=he(t),o=(g.provider||"anthropic").toUpperCase(),n=g.model||"claude-3-7-sonnet-20250219",i=g.provider==="anthropic"||g.provider==="openrouter"?"Active \u26A1":"Standard",a=(g.maxTokens||32768).toLocaleString(),l=`${g.timeoutSeconds||600}s`,h=g.apiKey?"Configured":g.provider==="ollama"?"Not Required (Local)":"Missing",p=g.baseUrl&&g.baseUrl.trim()?g.baseUrl.trim():"Default",r=`TidyProteomicsAgent v${e||"0.1.0"}`,c=`${o} | ${n}`;return`# Active Model Summary

Created: ${s}
Author: ${c}
Agent: ${r}

## Active Configuration

| Configuration Property | Value |
| :--- | :--- |
| **Provider** | ${o} |
| **Model** | ${n} |
| **Author** | ${c} |
| **Agent** | ${r} |
| **Prompt Caching** | ${i} |
| **Max Output Tokens** | ${a} |
| **Request Timeout** | ${l} |
| **Key Status** | ${h} |
| **Base URL** | ${p} |

---

## Agent Document Header Standard
All agent-authored documents and reports (including \`docs/observations.md\`, \`docs/scientific_report.md\`, and any other generated markdown reports) must reference this specification and place the following metadata block immediately below the title:

\`\`\`markdown
Title

Created: YYYY-MM-DD HH:MM
Author: ${c}
Agent: ${r}
\`\`\`
`}async function B(g,e,t="0.1.0"){if(!g)return"";let s=X.join(g,"docs");await D.mkdir(s,{recursive:!0});let o=X.join(s,"llm.md"),n=ue(e,t);try{let i=await D.readFile(o,"utf-8"),a=l=>l.replace(/Created:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/g,"");if(a(i)===a(n))return o}catch{}return await D.writeFile(o,n,"utf-8"),o}var Y=class{constructor(e,t,s,o,n,i="0.1.0"){this.workspaceRoot=e;this.client=t;this.tools=s;this.onStateChange=o;this.onLog=n;this.extensionVersion=i;this.workspaceRoot=e||"",this.chatLogger=new q(this.workspaceRoot),this.workspaceRoot&&this.rescanPhases().catch(a=>{console.error("[PipelineOrchestrator] Error rescanning phases:",a)})}phases=[];isRunning=!1;isFullPipelineRunning=!1;shouldStop=!1;chatLogger;setExtensionVersion(e){this.extensionVersion=e||"0.1.0"}async syncModelSummary(){return this.workspaceRoot?await B(this.workspaceRoot,this.client.getConfig(),this.extensionVersion):""}ts(){return new Date().toTimeString().split(" ")[0]}formatToolHeader(e,t){switch(e){case"execute_command":return`[Command] ${t?.command||""}`;case"read_file":{let s=t?.startLine?` (lines ${t.startLine}-${t.startLine+(t.maxLines||0)-1})`:"";return`[Read] ${t?.filePath||""}${s}`}case"write_file":{let s=typeof t?.content=="string"?` (${t.content.length} chars)`:"";return`[Write] ${t?.filePath||""}${s}`}case"replace_file_content":return`[Edit] ${t?.filePath||""}`;case"list_directory":return`[List] ${t?.dirPath||"."}`;case"check_checkpoint_gate":return`[Check Gate] ${Array.isArray(t?.requiredFiles)?t.requiredFiles.join(", "):""}`;case"complete_phase":return`[Complete Phase] ${t?.phaseName||""}`;default:{let s=Object.keys(t||{}),o=s.length>0?` (${s.join(", ")})`:"";return`[${e}]${o}`}}}getIsRunning(){return this.isRunning}getIsFullPipelineRunning(){return this.isFullPipelineRunning}async setWorkingDirectory(e){if(this.isRunning){this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Cannot change working directory while a pipeline or phase is actively running.`);return}this.workspaceRoot=e||"",this.tools.setWorkspaceRoot(this.workspaceRoot),this.chatLogger.setWorkspaceRoot(this.workspaceRoot);try{await this.rescanPhases()}catch(t){console.error("[PipelineOrchestrator] Error rescanning phases on directory change:",t)}}getWorkingDirectory(){return this.workspaceRoot}async loadNotesRecords(){let e=new Map;if(!this.workspaceRoot)return e;try{let t=T.join(this.workspaceRoot,"docs","notes.md"),o=(await S.readFile(t,"utf-8")).split(/\n(?=###\s+)/);for(let n of o){let i=n.match(/- \*\*File\*\*:\s*`([^`]+)`/);if(!i)continue;let a=i[1].trim(),l=n.match(/- \*\*Duration\*\*:\s*(\d+)s/),h=l?parseInt(l[1],10):void 0,p=n.match(/- \*\*Start\*\*:\s*([^\n\r]+)/),r=p?p[1].trim():void 0,c=n.match(/- \*\*End\*\*:\s*([^\n\r]+)/),f=c?c[1].trim():void 0,v=n.match(/- \*\*Token Usage\*\*:\s*Total:\s*(\d+|N\/A),\s*Prompt:\s*(\d+|N\/A),\s*Completion:\s*(\d+|N\/A)(?:,\s*Cached:\s*(\d+|N\/A))?/i),y;if(v){let k=v[1]!=="N/A"?parseInt(v[1],10):0,b=v[2]!=="N/A"?parseInt(v[2],10):0,L=v[3]!=="N/A"?parseInt(v[3],10):0,U=v[4]&&v[4]!=="N/A"?parseInt(v[4],10):0;y={totalTokens:k,promptTokens:b,completionTokens:L,cachedPromptTokens:U}}let I=n.includes("- COMPLETED"),P=n.includes("- FAILED"),E=I?"completed":P?"failed":"completed",M=n.match(/\*\*Summary\*\*:\s*\n([\s\S]*?)(?:\n---|\n###|$)/),N=M?M[1].trim():void 0,d={status:E,durationSeconds:h,tokenUsage:y,summary:N,startTime:r,endTime:f};e.set(a,d);let C=T.basename(a);e.has(C)||e.set(C,d)}}catch{}return e}async forceReloadFromDisk(){if(this.isRunning){this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Cannot force reload while an active pipeline run is in flight.`);return}await this.rescanPhases(!0),this.onLog(`[${this.ts()}] \u21BB [Pipeline] Reloaded all tasks and progress from disk.`)}async resetAllState(){if(this.isRunning){this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Cannot reset state while an active run is in flight.`);return}let e=T.join(this.workspaceRoot,"docs","notes.md");try{let t=`# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`;await S.writeFile(e,t,"utf-8")}catch{}for(let t of this.phases)t.status="pending",t.startTime=void 0,t.endTime=void 0,t.durationSeconds=void 0,t.tokenUsage=void 0,t.summary=void 0,t.error=void 0;await this.rescanPhases(!0),this.onLog(`[${this.ts()}] \u{1F9F9} [Pipeline] State and runtime blackboard reset to initial state.`)}async rescanPhases(e=!1){if(this.isRunning)return;if(!this.workspaceRoot){this.phases=[],await this.notifyState();return}let t=await this.loadNotesRecords(),s=e?new Map:new Map(this.phases.map(l=>[l.fileName,l])),o=new Map(this.phases.map(l=>[l.fileName,l.enabled])),n=[],i=T.join(this.workspaceRoot,"analysis"),a=!1;try{let h=(await S.readdir(i)).filter(p=>p.endsWith(".md")).sort();for(let p=0;p<h.length;p++){let r=h[p];r.startsWith("00_")&&(a=!0);let c=s.get(r),f=t.get(r)||t.get(T.basename(r)),v=c?.title;if(!v){try{let N=(await S.readFile(T.join(i,r),"utf-8")).split(`
`).find(d=>d.trim().startsWith("#"));N&&(v=N.replace(/^#+\s*/,"").trim())}catch{}v||(v=r.replace(/^[0-9]+_/,"").replace(/\.md$/,"").replace(/_/g," "),v=`Phase: ${v}`)}let y=r.match(/^([0-9]+)/)?.[1]||String(p+1).padStart(2,"0"),I=r.startsWith("00_"),P="pending";c?.status&&c.status!=="running"?P=c.status:f?.status&&(P=f.status);let E=o.has(r)?o.get(r):c?c.enabled:!0;n.push({id:y,fileName:r,title:v,status:P,enabled:E,isMasterSetup:I,startTime:c?.startTime||f?.startTime,endTime:c?.endTime||f?.endTime,durationSeconds:c?.durationSeconds||f?.durationSeconds,tokenUsage:c?.tokenUsage||f?.tokenUsage,summary:c?.summary||f?.summary,error:c?.error})}}catch{this.onLog(`[${this.ts()}] \u2139\uFE0F [Pipeline] Note: 'analysis' directory not found in ${this.workspaceRoot}`)}if(!a){let l="agent/INSTRUCT.md",h=T.join(this.workspaceRoot,"agent","INSTRUCT.md");try{await S.stat(h)}catch{l="prompts/INSTRUCT.md",h=T.join(this.workspaceRoot,"prompts","INSTRUCT.md")}try{await S.stat(h);let p=s.get(l)||s.get("agent/INSTRUCT.md")||s.get("prompts/INSTRUCT.md"),r=t.get(l)||t.get("agent/INSTRUCT.md")||t.get("prompts/INSTRUCT.md")||t.get("INSTRUCT.md"),c="pending";p?.status&&p.status!=="running"?c=p.status:r?.status&&(c=r.status);let f=o.has(l)?o.get(l):p?p.enabled:!0;n.unshift({id:"00",fileName:l,title:"Phase 0: Master Setup & Environment",status:c,enabled:f,isMasterSetup:!0,startTime:p?.startTime||r?.startTime,endTime:p?.endTime||r?.endTime,durationSeconds:p?.durationSeconds||r?.durationSeconds,tokenUsage:p?.tokenUsage||r?.tokenUsage,summary:p?.summary||r?.summary,error:p?.error})}catch{}}this.phases=n,await this.notifyState()}async getPromptFiles(){let e="agent";try{await S.stat(T.join(this.workspaceRoot,"agent"))}catch{e="prompts"}let t=[{name:"Analysis Protocol",relPath:`${e}/PROTOCOL.md`},{name:"TidyProteomics Skills",relPath:`${e}/SKILL.md`},{name:"Experiment & Dataset Spec",relPath:"docs/experiment.md"},{name:"Shared Memory",relPath:"docs/notes.md"},{name:"Active Model Summary",relPath:"docs/llm.md"},{name:"LLM Chat Log",relPath:"logs/llm_chat.md"}];try{await S.stat(T.join(this.workspaceRoot,`${e}/BIOLOGY.md`)),t.splice(1,0,{name:"Curated Biological Context",relPath:`${e}/BIOLOGY.md`})}catch{}try{await S.stat(T.join(this.workspaceRoot,`${e}/VARIABLES.md`)),t.splice(1,0,{name:"Legacy Dataset Variables",relPath:`${e}/VARIABLES.md`})}catch{}let s=[];for(let o of t){let n=!1;try{await S.stat(T.join(this.workspaceRoot,o.relPath)),n=!0}catch{n=!1}s.push({...o,exists:n})}return s}getPhases(){return[...this.phases]}togglePhase(e,t){let s=this.phases.find(o=>o.id===e);s&&(s.enabled=t,this.notifyState())}async addPhase(e,t){let s=e.endsWith(".md")?e:`${e}.md`,o=T.join(this.workspaceRoot,"analysis");await S.mkdir(o,{recursive:!0});let n=T.join(o,s),a=`### Phase: ${t||s.replace(/\.md$/,"").replace(/_/g," ")}
Construct and execute code for this phase, capturing output to logs.

#### Tasks:
- [ ] Task 1: Initialize step.
- [ ] Task 2: Execute analysis in R or shell.
- [ ] Checkpoint: Verify outputs and log files.
`;return await S.writeFile(n,a,"utf-8"),await this.rescanPhases(),n}async removePhase(e){let t=this.phases.findIndex(s=>s.id===e);if(t!==-1){let s=this.phases[t];if(!s.isMasterSetup)try{await S.unlink(T.join(this.workspaceRoot,"analysis",s.fileName))}catch{}this.phases.splice(t,1),await this.notifyState()}}async getFoldersStatus(){let e="agent";try{await S.stat(T.join(this.workspaceRoot,"agent"))}catch{e="prompts"}let t=[{name:"analysis",relPath:"analysis",description:"Phase Prompts (00_SETUP.md .. 04_SYNTHESIS.md)"},{name:e,relPath:e,description:"Protocol, Variables & Skills (Cached Prefix)"},{name:"code",relPath:"code",description:"Generated Analysis Scripts"},{name:"tools",relPath:"tools",description:"Linter & Execution Helper Utilities"},{name:"docs",relPath:"docs",description:"Shared Memory (notes.md, llm.md) & Experiment Design"},{name:"logs",relPath:"logs",description:"Execution Chat Trace (llm_chat.md)"},{name:"data",relPath:"data",description:"Raw Input Proteomics Data"}],s=[];if(!this.workspaceRoot)return s;for(let o of t){let n=T.join(this.workspaceRoot,o.relPath),i=!1,a=0;try{(await S.stat(n)).isDirectory()&&(i=!0,a=(await S.readdir(n)).filter(p=>!p.startsWith(".")).length)}catch{i=!1}s.push({...o,exists:i,itemCount:a})}return s}async getState(){let e=this.client.getConfig(),t=0,s=0,o=0,n=0;for(let l of this.phases)l.tokenUsage&&(t+=l.tokenUsage.promptTokens,s+=l.tokenUsage.completionTokens,o+=l.tokenUsage.totalTokens,n+=l.tokenUsage.cachedPromptTokens||0);let i=await this.getPromptFiles(),a=await this.getFoldersStatus();return{workingDirectory:this.workspaceRoot,workspaceName:this.workspaceRoot?T.basename(this.workspaceRoot):"No Folder Open",model:e.model,provider:e.provider,startTime:new Date().toISOString(),isRunning:this.isRunning,isFullPipelineRunning:this.isFullPipelineRunning,currentPhaseIndex:this.phases.findIndex(l=>l.status==="running"),phases:this.phases,promptFiles:i,folders:a,totalTokens:{promptTokens:t,completionTokens:s,totalTokens:o,cachedPromptTokens:n}}}async notifyState(){try{let e=await this.getState();this.onStateChange(e)}catch(e){console.error("[PipelineOrchestrator] Error in notifyState:",e)}}stop(){this.shouldStop=!0,this.isFullPipelineRunning=!1;for(let e of this.phases)e.status==="running"&&(e.status="failed",e.error="Stopped by user");this.isRunning=!1,this.onLog(`[${this.ts()}] \u23F9 [Pipeline] Execution stopped by user.`),this.notifyState()}async pruneNotesFromPhase(e){if(!this.workspaceRoot)return;let t=this.phases.slice(e);if(t.length===0)return;let s=new Set;for(let n of t)s.add(n.fileName),s.add(T.basename(n.fileName)),n.isMasterSetup&&(s.add("agent/INSTRUCT.md"),s.add("prompts/INSTRUCT.md"),s.add("INSTRUCT.md"));let o=T.join(this.workspaceRoot,"docs","notes.md");try{let i=(await S.readFile(o,"utf-8")).split(/\n(?=###\s+)/),a=[];for(let h of i){let p=h.match(/- \*\*File\*\*:\s*`([^`]+)`/);if(p){let r=p[1].trim(),c=T.basename(r);if(s.has(r)||s.has(c))continue}a.push(h)}let l=a.join(`
`).replace(/\n{3,}/g,`

`).trim()+`
`;await S.writeFile(o,l,"utf-8")}catch{}}async runSinglePhase(e){if(this.isRunning){this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Execution busy: A pipeline or phase is already running. Please wait or stop it first.`);return}let t=this.phases.findIndex(s=>s.id===e);if(t===-1){this.onLog(`[${this.ts()}] \u274C [Pipeline] Phase ID '${e}' not found.`);return}for(let s=t;s<this.phases.length;s++){let o=this.phases[s];s===t?(o.status="running",o.startTime=new Date().toISOString(),o.endTime=void 0,o.durationSeconds=void 0,o.tokenUsage=void 0,o.summary=void 0,o.error=void 0):(o.status="pending",o.startTime=void 0,o.endTime=void 0,o.durationSeconds=void 0,o.tokenUsage=void 0,o.summary=void 0,o.error=void 0)}await this.pruneNotesFromPhase(t),await this.notifyState(),this.isRunning=!0,this.isFullPipelineRunning=!1,this.shouldStop=!1;try{await this.executePhase(t)}catch(s){this.onLog(`[${this.ts()}] \u274C [Pipeline] Error running phase ${e}: ${s.message}`)}finally{this.isRunning=!1,this.isFullPipelineRunning=!1,await this.notifyState()}}async runFullPipeline(){if(this.isRunning){this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Execution busy: A pipeline is already running.`);return}this.isRunning=!0,this.isFullPipelineRunning=!0,this.shouldStop=!1,this.onLog(`[${this.ts()}] \u{1F680} [Pipeline] Starting autonomous run at ${new Date().toLocaleTimeString()}`),this.onLog(`[${this.ts()}] \u{1F4C1} [Pipeline] Working Directory: ${this.workspaceRoot}`);try{for(let e=0;e<this.phases.length;e++){if(this.shouldStop){this.onLog(`[${this.ts()}] \u23F9 [Pipeline] Execution stopped by user.`);break}let t=this.phases[e];if(!t.enabled){this.onLog(`[${this.ts()}] \u23ED\uFE0F [Pipeline] Skipping disabled phase: ${t.title}`);continue}if(await this.pruneNotesFromPhase(e),!await this.executePhase(e)){this.onLog(`[${this.ts()}] \u26A0\uFE0F [Pipeline] Pipeline paused due to checkpoint failure in ${t.title}`);break}}}catch(e){this.onLog(`[${this.ts()}] \u274C [Pipeline] Full pipeline error: ${e.message}`)}finally{this.isRunning=!1,this.isFullPipelineRunning=!1,this.shouldStop=!1,await this.notifyState()}}async executePhase(e){let t=this.phases[e]?.id,s=()=>{if(t){let a=this.phases.find(l=>l.id===t);if(a)return a}return this.phases[e]},o=s();if(!o)return!1;o.status="running",o.startTime=new Date().toISOString(),o.endTime=void 0,o.error=void 0,o.tokenUsage||(o.tokenUsage={promptTokens:0,completionTokens:0,totalTokens:0,cachedPromptTokens:0});let n=Date.now();await this.notifyState(),this.onLog(`[${this.ts()}] \u{1F680} Starting ${o.title} (${o.fileName})`);let i;try{try{await B(this.workspaceRoot,this.client.getConfig(),this.extensionVersion)}catch(c){console.warn("[PipelineOrchestrator] Could not write docs/llm.md before phase execution:",c)}let l=await new z(this.workspaceRoot).buildPhaseContext(o.fileName);i=new V(o.fileName,o.title,this.client,this.tools,l,async c=>{if(c.type==="thought")this.onLog(`[${this.ts()}] \u{1F504} ${c.data}`);else if(c.type!=="text"){if(c.type==="tool_start")this.onLog(`[${this.ts()}] \u{1F6E0}\uFE0F ${this.formatToolHeader(c.data.name,c.data.args)}`);else if(c.type==="tool_end")this.onLog(`[${this.ts()}] ${c.data.isError?"\u274C":"\u2713"} [Result] ${c.data.name} ${c.data.isError?"failed":"completed"}`);else if(c.type==="tokens"){let f=s();f.tokenUsage={...c.data.totalUsage},await this.notifyState()}}},this.chatLogger,()=>this.shouldStop);let h=await i.run(),p=Math.max(1,Math.round((Date.now()-n)/1e3)),r=s();if(r.endTime=new Date().toISOString(),r.durationSeconds=p,r.tokenUsage=h.tokensUsed,r.summary=h.summary,h.success)return r.status="completed",this.onLog(`[${this.ts()}] \u2705 ${r.title} completed in ${p}s (${h.tokensUsed.totalTokens.toLocaleString()} tokens)`),await this.appendPhaseRecordToNotes(r),await this.notifyState(),!0;{r.status="failed",r.error=h.summary;let c=String(h.summary||"Phase failed").split(`
`)[0];return this.onLog(`[${this.ts()}] \u274C ${r.title} failed: ${c}`),await this.notifyState(),!1}}catch(a){let l=s();return l.status="failed",l.error=a.message,i&&(!l.tokenUsage||l.tokenUsage.totalTokens===0)&&(l.tokenUsage=i.getTotalUsage()),this.onLog(`[${this.ts()}] \u274C Error in ${l.title}: ${a.message}`),await this.notifyState(),!1}}async appendPhaseRecordToNotes(e){let t=T.join(this.workspaceRoot,"docs","notes.md"),s=`
### ${e.title} - COMPLETED
- **File**: \`${e.fileName}\`
- **Duration**: ${e.durationSeconds}s
- **Start**: ${e.startTime}
- **End**: ${e.endTime}
- **Token Usage**: Total: ${e.tokenUsage?.totalTokens||"N/A"}, Prompt: ${e.tokenUsage?.promptTokens||"N/A"}, Completion: ${e.tokenUsage?.completionTokens||"N/A"}, Cached: ${e.tokenUsage?.cachedPromptTokens||0}
- **Summary**:
${e.summary||"Phase checkpoints verified."}

---
`;try{await S.mkdir(T.dirname(t),{recursive:!0});let o="";try{o=await S.readFile(t,"utf-8")}catch{o=`# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`}await S.writeFile(t,o+s,"utf-8")}catch(o){this.onLog(`[${this.ts()}] \u26A0\uFE0F Warning: Failed to update docs/notes.md: ${o}`)}}};var Q=class{constructor(e){this.config=e}updateConfig(e){this.config={...this.config,...e}}getConfig(){return{...this.config}}getTimeoutSeconds(){return this.config.timeoutSeconds&&this.config.timeoutSeconds>0?this.config.timeoutSeconds:600}getTimeoutMs(){return this.getTimeoutSeconds()*1e3}async chat(e){switch(this.config.provider){case"anthropic":return this.chatAnthropic(e);case"gemini":return this.chatGemini(e);case"openrouter":return this.chatOpenRouter(e);case"ollama":return this.chatOllama(e);case"openai":default:return this.chatOpenAI(e)}}async chatAnthropic(e){let t="https://api.anthropic.com/v1/messages",s=e.tools.map(b=>({name:b.name,description:b.description,input_schema:b.parameters})),o=[],n=0;for(;n<e.messages.length;){let b=e.messages[n];if(b.role==="system"){n++;continue}if(b.role==="tool"){let L=[];for(;n<e.messages.length&&e.messages[n].role==="tool";){let U=e.messages[n];L.push({type:"tool_result",tool_use_id:U.tool_call_id,content:U.content}),n++}o.push({role:"user",content:L});continue}else if(b.role==="assistant"&&b.tool_calls&&b.tool_calls.length>0){let L=[];b.content&&L.push({type:"text",text:b.content});for(let U of b.tool_calls)L.push({type:"tool_use",id:U.id,name:U.name,input:U.args});o.push({role:"assistant",content:L})}else o.push({role:b.role==="assistant"?"assistant":"user",content:b.content});n++}let i=[];for(let b of o){let L=i[i.length-1];if(L&&L.role===b.role){let U=Array.isArray(L.content)?L.content:[{type:"text",text:String(L.content)}],ne=Array.isArray(b.content)?b.content:[{type:"text",text:String(b.content)}];L.content=[...U,...ne]}else i.push(b)}let a=[{type:"text",text:e.system,cache_control:{type:"ephemeral"}}],l=this.config.maxTokens||16384,h={model:this.config.model||"claude-3-7-sonnet-20250219",max_tokens:l,temperature:this.config.temperature??.2,system:a,messages:i,tools:s},p=this.getTimeoutSeconds(),r;try{r=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":this.config.apiKey,"anthropic-version":"2023-06-01","anthropic-beta":"prompt-caching-2024-07-31"},body:JSON.stringify(h),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(b){throw b.name==="TimeoutError"||b.message&&b.message.includes("timeout")?new Error(`Anthropic API request timed out after ${p}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):b}if(!r.ok){let b=await r.text();throw new Error(`Anthropic API error (${r.status}): ${b}`)}let c=await r.json(),f="",v=[];for(let b of c.content||[])b.type==="text"?(f+=b.text,e.onToken&&e.onToken(b.text)):b.type==="tool_use"&&v.push({id:b.id,name:b.name,args:b.input||{}});let y=c.stop_reason,I=y==="max_tokens";I&&console.warn(`[ProviderClient] Anthropic generation cut off: hit max_tokens limit (${l}).`);let P=c.usage?.cache_read_input_tokens||0,E=c.usage?.cache_creation_input_tokens||0,M=c.usage?.input_tokens||0,N=c.usage?.output_tokens||0,d=M+P+E,C=d+N,k={promptTokens:d,completionTokens:N,totalTokens:C,cachedPromptTokens:P};return{content:f,tool_calls:v.length>0?v:void 0,usage:k,finishReason:y,truncationDetected:I}}async chatGemini(e){let s=`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model||"gemini-1.5-pro"}:generateContent?key=${this.config.apiKey}`,o=[{functionDeclarations:e.tools.map(k=>({name:k.name,description:k.description,parameters:k.parameters}))}],n=[],i=0;for(;i<e.messages.length;){let k=e.messages[i];if(k.role==="system"){i++;continue}if(k.role==="tool"){let b=[];for(;i<e.messages.length&&e.messages[i].role==="tool";){let L=e.messages[i];b.push({functionResponse:{name:L.tool_name||L.tool_call_id||"tool_result",response:{output:L.content}}}),i++}n.push({role:"user",parts:b});continue}else if(k.role==="assistant"&&k.tool_calls){let b=[];k.content&&b.push({text:k.content});for(let L of k.tool_calls)b.push({functionCall:{name:L.name,args:L.args}});n.push({role:"model",parts:b})}else n.push({role:k.role==="assistant"?"model":"user",parts:[{text:k.content}]});i++}let a=[];for(let k of n){let b=a[a.length-1];b&&b.role===k.role?b.parts.push(...k.parts):a.push(k)}let l=this.config.maxTokens||16384,h={systemInstruction:{parts:[{text:e.system}]},contents:a,tools:o,generationConfig:{temperature:this.config.temperature??.2,maxOutputTokens:l}},p=this.getTimeoutSeconds(),r;try{r=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(h),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(k){throw k.name==="TimeoutError"||k.message&&k.message.includes("timeout")?new Error(`Gemini API request timed out after ${p}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):k}if(!r.ok){let k=await r.text();throw new Error(`Gemini API error (${r.status}): ${k}`)}let c=await r.json(),f=c.candidates?.[0],v=f?.finishReason,y=v==="MAX_TOKENS";y&&console.warn(`[ProviderClient] Gemini generation cut off: hit MAX_TOKENS limit (${l}).`);let I="",P=[];for(let k of f?.content?.parts||[])k.text&&(I+=k.text,e.onToken&&e.onToken(k.text)),k.functionCall&&P.push({id:`call_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,name:k.functionCall.name,args:k.functionCall.args||{}});let E=c.usageMetadata?.promptTokenCount||0,M=c.usageMetadata?.candidatesTokenCount||0,N=c.usageMetadata?.cachedContentTokenCount||0,d=c.usageMetadata?.totalTokenCount??E+M,C={promptTokens:E,completionTokens:M,totalTokens:d,cachedPromptTokens:N};return{content:I,tool_calls:P.length>0?P:void 0,usage:C,finishReason:v,truncationDetected:y}}async chatOpenAI(e){let s=`${this.config.baseUrl||"https://api.openai.com/v1"}/chat/completions`,o=e.tools.map(d=>({type:"function",function:{name:d.name,description:d.description,parameters:d.parameters}})),n=[{role:"system",content:e.system}];for(let d of e.messages)d.role==="tool"?n.push({role:"tool",tool_call_id:d.tool_call_id,content:d.content}):d.role==="assistant"&&d.tool_calls?n.push({role:"assistant",content:d.content||null,tool_calls:d.tool_calls.map(C=>({id:C.id,type:"function",function:{name:C.name,arguments:JSON.stringify(C.args)}}))}):n.push({role:d.role,content:d.content});let i=this.config.maxTokens||16384,a={model:this.config.model||"gpt-4o",messages:n,tools:o.length>0?o:void 0,temperature:this.config.temperature??.2,max_tokens:i},l=this.getTimeoutSeconds(),h;try{h=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.config.apiKey}`},body:JSON.stringify(a),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(d){throw d.name==="TimeoutError"||d.message&&d.message.includes("timeout")?new Error(`OpenAI API request timed out after ${l}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):d}if(!h.ok){let d=await h.text();throw new Error(`OpenAI API error (${h.status}): ${d}`)}let p=await h.json(),r=p.choices?.[0]?.message,c=p.choices?.[0]?.finish_reason,f=c==="length"||c==="max_tokens",v=r?.content||"";v&&e.onToken&&e.onToken(v);let y=[];for(let d of r?.tool_calls||[])try{y.push({id:d.id,name:d.function.name,args:typeof d.function.arguments=="string"?JSON.parse(d.function.arguments):d.function.arguments||{}})}catch(C){console.error(`[ProviderClient] Failed to parse tool call arguments for ${d.function?.name}:`,C),f&&console.error(`[ProviderClient] Output truncated at max_tokens (${i}) with finish_reason="${c}". Tool call JSON was incomplete.`)}let I=p.usage?.prompt_tokens||0,P=p.usage?.completion_tokens||0,E=p.usage?.prompt_tokens_details?.cached_tokens||0,M=p.usage?.total_tokens??I+P,N={promptTokens:I,completionTokens:P,totalTokens:M,cachedPromptTokens:E};return{content:v,tool_calls:y.length>0?y:void 0,usage:N,finishReason:c,truncationDetected:f}}async chatOpenRouter(e){let s=`${(this.config.baseUrl||"https://openrouter.ai/api/v1").replace(/\/+$/,"")}/chat/completions`,o=e.tools.map(d=>({type:"function",function:{name:d.name,description:d.description,parameters:d.parameters}})),n=[{role:"system",content:e.system}];for(let d of e.messages)d.role==="tool"?n.push({role:"tool",tool_call_id:d.tool_call_id,content:d.content}):d.role==="assistant"&&d.tool_calls?n.push({role:"assistant",content:d.content||null,tool_calls:d.tool_calls.map(C=>({id:C.id,type:"function",function:{name:C.name,arguments:JSON.stringify(C.args)}}))}):n.push({role:d.role,content:d.content});let i=this.config.maxTokens||32768,a={model:this.config.model||"anthropic/claude-3.7-sonnet",messages:n,tools:o.length>0?o:void 0,temperature:this.config.temperature??.2,max_tokens:i},l=this.getTimeoutSeconds(),h;try{h=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.config.apiKey}`,"HTTP-Referer":"https://github.com/tidyproteomicsagent","X-Title":"TidyProteomicsAgent"},body:JSON.stringify(a),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(d){throw d.name==="TimeoutError"||d.message&&d.message.includes("timeout")?new Error(`OpenRouter API request timed out after ${l}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):d}if(!h.ok){let d=await h.text();throw new Error(`OpenRouter API error (${h.status}): ${d}`)}let p=await h.json(),r=p.choices?.[0]?.message,c=p.choices?.[0]?.finish_reason,f=c==="length"||c==="max_tokens",v=r?.content||"";v&&e.onToken&&e.onToken(v);let y=[];for(let d of r?.tool_calls||[])try{y.push({id:d.id,name:d.function.name,args:typeof d.function.arguments=="string"?JSON.parse(d.function.arguments):d.function.arguments||{}})}catch(C){console.error(`[ProviderClient] Failed to parse tool call arguments for ${d.function?.name}:`,C),f&&console.error(`[ProviderClient] Output truncated at max_tokens (${i}) with finish_reason="${c}". Tool call JSON was incomplete.`)}let I=p.usage?.prompt_tokens||0,P=p.usage?.completion_tokens||0,E=p.usage?.prompt_tokens_details?.cached_tokens??p.usage?.cache_read_input_tokens??0,M=p.usage?.total_tokens??I+P,N={promptTokens:I,completionTokens:P,totalTokens:M,cachedPromptTokens:E};return{content:v,tool_calls:y.length>0?y:void 0,usage:N,finishReason:c,truncationDetected:f}}async chatOllama(e){let t=(this.config.baseUrl||"http://localhost:11434").replace(/\/+$/,"");t.endsWith("/v1")||(t+="/v1");let s=`${t}/chat/completions`,o=e.tools.map(d=>({type:"function",function:{name:d.name,description:d.description,parameters:d.parameters}})),n=[{role:"system",content:e.system}];for(let d of e.messages)d.role==="tool"?n.push({role:"tool",tool_call_id:d.tool_call_id,content:d.content}):d.role==="assistant"&&d.tool_calls?n.push({role:"assistant",content:d.content||null,tool_calls:d.tool_calls.map(C=>({id:C.id,type:"function",function:{name:C.name,arguments:JSON.stringify(C.args)}}))}):n.push({role:d.role,content:d.content});let i=this.config.maxTokens||16384,a={model:this.config.model||"llama3.3:70b",messages:n,tools:o.length>0?o:void 0,temperature:this.config.temperature??.2,max_tokens:i,options:{num_predict:i},stream:!1},l={"Content-Type":"application/json"};this.config.apiKey&&(l.Authorization=`Bearer ${this.config.apiKey}`);let h=this.getTimeoutSeconds(),p;try{p=await fetch(s,{method:"POST",headers:l,body:JSON.stringify(a),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(d){throw d.name==="TimeoutError"||d.message&&d.message.includes("timeout")?new Error(`Remote Ollama API request timed out after ${h}s at ${s}. For local/remote 70B models, increase Request Timeout in settings.`):d}if(!p.ok){let d=await p.text();throw new Error(`Remote Ollama API error at ${s} (${p.status}): ${d}`)}let r=await p.json(),c=r.choices?.[0]?.message,f=r.choices?.[0]?.finish_reason||r.done_reason,v=f==="length",y=c?.content||"";y&&e.onToken&&e.onToken(y);let I=[];for(let d of c?.tool_calls||[])try{I.push({id:d.id||`call_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,name:d.function.name,args:typeof d.function.arguments=="string"?JSON.parse(d.function.arguments):d.function.arguments||{}})}catch(C){console.error(`[ProviderClient] Failed to parse tool call arguments for ${d.function?.name}:`,C),v&&console.error(`[ProviderClient] Output truncated at max_tokens (${i}) with finish_reason="${f}".`)}let P=r.usage?.prompt_tokens??r.prompt_eval_count??0,E=r.usage?.completion_tokens??r.eval_count??0,M=r.usage?.total_tokens??P+E,N={promptTokens:P,completionTokens:E,totalTokens:M,cachedPromptTokens:0};return{content:y,tool_calls:I.length>0?I:void 0,usage:N,finishReason:f,truncationDetected:v}}};var _=$(require("fs/promises")),j=$(require("fs")),te=$(require("readline")),R=$(require("path")),se=require("child_process"),oe=require("util"),me=(0,oe.promisify)(se.exec),J=class{constructor(e){this.workspaceRoot=e;this.workspaceRoot=e||"",this.registerDefaultTools()}tools=new Map;setWorkspaceRoot(e){this.workspaceRoot=e||""}getDefinitions(){return Array.from(this.tools.values()).map(e=>e.definition)}async execute(e,t){let s=this.tools.get(e);if(!s)return{tool_call_id:"",content:`Error: Tool '${e}' not found. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,isError:!0};try{return{tool_call_id:"",content:await s.execute(t),isError:!1}}catch(o){return{tool_call_id:"",content:`Error executing tool '${e}': ${o.message||String(o)}`,isError:!0}}}resolvePath(e){let t=this.workspaceRoot||"";if(!t)throw new Error("No active workspace directory set.");let s=R.isAbsolute(e)?R.resolve(e):R.resolve(t,e),o=R.resolve(t);if(s!==o&&!s.startsWith(o+R.sep))throw new Error(`Security restriction: access to '${e}' outside workspace root is denied.`);return s}assertNotProtected(e){let t=this.workspaceRoot||"",s=R.isAbsolute(e)?R.resolve(e):R.resolve(t,e),o=t?R.relative(R.resolve(t),s).replace(/\\/g,"/"):e.replace(/\\/g,"/");if(["docs/experiment.md","docs/llm.md","agent/PROTOCOL.md","agent/SKILL.md","agent/VARIABLES.md"].some(i=>o===i||o.endsWith("/"+i)))throw new Error(`Security Policy Violation: '${e}' is a protected user or extension specification file and cannot be modified by the agent. Record runtime logs in 'docs/notes.md' and biological findings in 'docs/observations.md'.`)}registerDefaultTools(){this.tools.set("execute_command",{definition:{name:"execute_command",description:"Executes a shell command in the workspace directory (e.g. running Rscript code/01_inspect_dataset.R). Captures stdout and stderr.",parameters:{type:"object",properties:{command:{type:"string",description:"The shell command line to run"},timeoutMs:{type:"number",description:"Optional execution timeout in milliseconds (default: 600000ms / 10m)"}},required:["command"]}},execute:async e=>{let t=e.timeoutMs||6e5;try{let s=this.workspaceRoot;if(!s)throw new Error("Cannot execute command: No active workspace directory is configured.");let o=process.platform==="win32"?void 0:process.env.SHELL&&j.existsSync(process.env.SHELL)?process.env.SHELL:j.existsSync("/bin/bash")?"/bin/bash":"/bin/sh",{stdout:n,stderr:i}=await me(e.command,{cwd:s,timeout:t,maxBuffer:10*1024*1024,shell:o}),a="";return n&&(a+=`STDOUT:
${n}
`),i&&(a+=`STDERR:
${i}
`),a.trim()||"Command executed successfully with no console output."}catch(s){let o=`Command failed with exit code ${s.code??"unknown"}
`;return s.stdout&&(o+=`STDOUT:
${s.stdout}
`),s.stderr&&(o+=`STDERR:
${s.stderr}
`),s.message&&(o+=`Error message: ${s.message}
`),o}}}),this.tools.set("read_file",{definition:{name:"read_file",description:"Reads file content from the workspace with optional startLine and maxLines for context economy.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative or absolute path to the file to read"},startLine:{type:"number",description:"Optional 1-based start line number"},maxLines:{type:"number",description:"Optional maximum lines to read (prevents dumping large logs or tables)"}},required:["filePath"]}},execute:async e=>{let t=this.resolvePath(e.filePath),s=Math.max(1,e.startLine||1),o=Math.max(1,e.maxLines||2e3),n=j.createReadStream(t,{encoding:"utf-8"}),i=te.createInterface({input:n,crlfDelay:1/0}),a=[],l=0,h=0;for await(let r of i)l++,h=l,l>=s&&a.length<o&&a.push(`${l}: ${r}`);let p=a.length>0?s+a.length-1:s;return`File: ${e.filePath} (Lines ${s}-${p} of ${h}):
${a.join(`
`)}`}}),this.tools.set("write_file",{definition:{name:"write_file",description:"Creates or overwrites a file in the workspace with new content.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative path to the file to write"},content:{type:"string",description:"Complete text content to write into the file"}},required:["filePath","content"]}},execute:async e=>{this.assertNotProtected(e.filePath);let t=this.resolvePath(e.filePath);return await _.mkdir(R.dirname(t),{recursive:!0}),await _.writeFile(t,e.content,"utf-8"),`Successfully wrote ${e.content.length} characters to ${e.filePath}`}}),this.tools.set("replace_file_content",{definition:{name:"replace_file_content",description:"Replaces an exact target substring with replacement content in an existing file. Note: For analysis scripts and files under 150 lines, prefer 'write_file' to overwrite the complete file cleanly and avoid whitespace mismatch errors.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative path to the file to edit"},targetContent:{type:"string",description:"Exact substring to find and replace"},replacementContent:{type:"string",description:"New content to replace the target substring with"}},required:["filePath","targetContent","replacementContent"]}},execute:async e=>{this.assertNotProtected(e.filePath);let t=this.resolvePath(e.filePath),s=await _.readFile(t,"utf-8");if(!s.includes(e.targetContent))throw new Error(`Target content was not found in ${e.filePath}. Ensure exact whitespace and line match.`);let o=s.replace(e.targetContent,()=>e.replacementContent);return await _.writeFile(t,o,"utf-8"),`Successfully replaced content in ${e.filePath}`}}),this.tools.set("list_directory",{definition:{name:"list_directory",description:"Lists files and folders inside a given workspace directory.",parameters:{type:"object",properties:{dirPath:{type:"string",description:"Relative path to directory to inspect (e.g. 'data', 'logs', 'code')"}},required:["dirPath"]}},execute:async e=>{let t=this.resolvePath(e.dirPath||"."),o=(await _.readdir(t,{withFileTypes:!0})).map(n=>`${n.isDirectory()?"[DIR]":"[FILE]"} ${n.name}`).join(`
`);return`Directory '${e.dirPath}':
${o||"(empty)"}`}}),this.tools.set("check_checkpoint_gate",{definition:{name:"check_checkpoint_gate",description:"Checks whether required checkpoint files exist, are non-empty, and returns their file size.",parameters:{type:"object",properties:{requiredFiles:{type:"array",description:"Array of relative paths to files that must exist (e.g. ['logs/01_data_quality.log', 'data/tidyproteomics_data.rds'])",items:{type:"string"}}},required:["requiredFiles"]}},execute:async e=>{let t=[],s=!0;for(let o of e.requiredFiles){let n=this.resolvePath(o);if(o.includes("*")){let i=R.dirname(n),a=R.basename(o);try{let l=await _.readdir(i),h="^"+a.replace(/[-/\\^$+?.()|[\]{}]/g,"\\$&").replace(/\\\*/g,".*")+"$",p=new RegExp(h),r=l.filter(c=>p.test(c));if(r.length>0){let c=!1;for(let f of r){let v=await _.stat(R.join(i,f));v.size>0&&(c=!0,t.push(`PASS: ${R.join(R.dirname(o),f)} (size: ${v.size} bytes)`))}c||(t.push(`FAIL: ${o} matched files but all had 0 bytes`),s=!1)}else t.push(`FAIL: ${o} matched 0 files in directory`),s=!1}catch{t.push(`FAIL: Directory for ${o} does not exist`),s=!1}}else try{let i=await _.stat(n);i.size>0?t.push(`PASS: ${o} (size: ${i.size} bytes)`):(t.push(`FAIL: ${o} exists but has 0 bytes`),s=!1)}catch{t.push(`FAIL: ${o} does not exist`),s=!1}}return`Checkpoint Gate Status: ${s?"ALL CHECKPOINTS PASSED":"GATE FAILED"}
${t.join(`
`)}`}}),this.tools.set("complete_phase",{definition:{name:"complete_phase",description:"Signals that the current phase's objectives, code execution, and quality gates have completed successfully.",parameters:{type:"object",properties:{phaseName:{type:"string",description:"The name or filename of the completed phase"},summary:{type:"string",description:"Structured summary of findings, verified outputs, and gate status to update notes.md"}},required:["phaseName","summary"]}},execute:async e=>`PHASE_COMPLETED: ${e.phaseName}
Summary:
${e.summary}`})}};var W=class{constructor(e,t){this._extensionUri=e;this.context=t;this.workspaceRoot=this.getActiveWorkspaceRoot();let s=m.workspace.getConfiguration("tidyproteomicsagent"),o=s.get("baseUrl")||t.globalState.get("tidyproteomicsagent.baseUrl")||"",n=s.get("provider")||t.globalState.get("tidyproteomicsagent.provider")||"anthropic",i=s.get("model")||t.globalState.get("tidyproteomicsagent.model")||"claude-3-7-sonnet-20250219",a=s.get("maxTokens")||t.globalState.get("tidyproteomicsagent.maxTokens")||32768,l=s.get("timeoutSeconds")||t.globalState.get("tidyproteomicsagent.timeoutSeconds")||600,h=s.get("apiKey")||t.globalState.get("tidyproteomicsagent.apiKey")||"",p={provider:n,model:i,apiKey:h,baseUrl:o,maxTokens:a,timeoutSeconds:l};this.client=new Q(p),t.secrets.get("tidyproteomicsagent.apiKey").then(r=>{r&&(this.client.updateConfig({apiKey:r}),this.syncActiveModelSummary().catch(()=>{}),this.refreshState().catch(()=>{}))},r=>{console.warn("[SidebarViewProvider] Could not load API key from secrets:",r)}),this.tools=new J(this.workspaceRoot),this.orchestrator=new Y(this.workspaceRoot,this.client,this.tools,r=>this.sendStateUpdate(r),r=>this.sendLog(r),this.getExtensionVersion()),this.syncActiveModelSummary().catch(()=>{}),t.subscriptions.push(m.workspace.onDidChangeConfiguration(async r=>{if(r.affectsConfiguration("tidyproteomicsagent")){let c=m.workspace.getConfiguration("tidyproteomicsagent"),f=c.get("provider");this.client.updateConfig({...f?{provider:f}:{},model:c.get("model"),baseUrl:c.get("baseUrl"),maxTokens:c.get("maxTokens"),timeoutSeconds:c.get("timeoutSeconds")}),await this.syncActiveModelSummary(),this.refreshState().catch(()=>{})}}))}static viewType="tidyproteomicsagent.sidebarView";_view;orchestrator;client;tools;workspaceRoot;customWorkspaceRoot;onFolderChangedCallback;getExtensionVersion(){try{if(this.context.extension?.packageJSON?.version)return this.context.extension.packageJSON.version;let e=u.join(this._extensionUri.fsPath,"package.json");if(w.existsSync(e)){let t=JSON.parse(w.readFileSync(e,"utf-8"));if(t.version)return t.version}}catch{}return"0.1.0"}async syncActiveModelSummary(){if(this.workspaceRoot)try{let e=this.getExtensionVersion();this.orchestrator&&this.orchestrator.setExtensionVersion(e),await B(this.workspaceRoot,this.client.getConfig(),e)}catch(e){console.error("[SidebarViewProvider] Error syncing active model summary:",e)}}setCustomWorkspaceRoot(e){this.customWorkspaceRoot=e,this.workspaceRoot=e}getActiveWorkspaceRoot(){if(this.customWorkspaceRoot&&w.existsSync(this.customWorkspaceRoot))return this.customWorkspaceRoot;let e=m.workspace.workspaceFolders;if(e&&e.length>0){let s=m.window.activeTextEditor?.document;if(s&&s.uri.scheme==="file"){let n=m.workspace.getWorkspaceFolder(s.uri);if(n){let i=n.uri.fsPath;if(i.endsWith("/extension")||i.endsWith("\\extension")){let a=u.dirname(i);if(w.existsSync(u.join(a,"agent"))||w.existsSync(u.join(a,"prompts"))||w.existsSync(u.join(a,"analysis")))return a}return i}}let o=e[0].uri.fsPath;if(o.endsWith("/extension")||o.endsWith("\\extension")){let n=u.dirname(o);if(w.existsSync(u.join(n,"agent"))||w.existsSync(u.join(n,"prompts"))||w.existsSync(u.join(n,"analysis")))return n}return o}let t=m.window.activeTextEditor?.document;if(t&&t.uri.scheme==="file"){let s=u.dirname(t.uri.fsPath);if(w.existsSync(u.join(s,"agent"))||w.existsSync(u.join(s,"prompts"))||w.existsSync(u.join(s,"analysis")))return s;let o=u.dirname(s);return w.existsSync(u.join(o,"agent"))||w.existsSync(u.join(o,"prompts"))||w.existsSync(u.join(o,"analysis"))?o:s}return""}isScanning=!1;pendingScan=!1;async onWorkspaceChanged(){try{if(this.orchestrator?.getIsRunning())return;this.customWorkspaceRoot=void 0;let e=this.getActiveWorkspaceRoot(),t=e!==this.workspaceRoot;this.workspaceRoot=e,this.tools.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&(t?await this.orchestrator.setWorkingDirectory(this.workspaceRoot):await this.refreshPhases()),await this.syncActiveModelSummary()}catch(e){console.error("[SidebarViewProvider] Error in onWorkspaceChanged:",e)}}async refreshPhases(){if(!(this.isScanning||this.orchestrator?.getIsRunning())){this.isScanning=!0;try{if(this.orchestrator){await this.orchestrator.rescanPhases();let e=await this.orchestrator.getState();this.sendStateUpdate(e)}}catch(e){console.error("[SidebarViewProvider] Error in refreshPhases:",e)}finally{this.isScanning=!1,this.pendingScan&&!this.orchestrator?.getIsRunning()&&(this.pendingScan=!1,this.refreshPhases().catch(()=>{}))}}}async refreshState(){try{if(this.orchestrator){let e=await this.orchestrator.getState();this.sendStateUpdate(e)}}catch(e){console.error("[SidebarViewProvider] Error in refreshState:",e)}}async forceReload(){if(!(this.isScanning||this.orchestrator?.getIsRunning()))try{this.orchestrator&&await this.orchestrator.forceReloadFromDisk()}catch(e){console.error("[SidebarViewProvider] Error in forceReload:",e)}}async resetAllState(){if(!(this.isScanning||this.orchestrator?.getIsRunning()))try{await this.syncActiveModelSummary(),this.orchestrator&&await this.orchestrator.resetAllState()}catch(e){console.error("[SidebarViewProvider] Error in resetAllState:",e)}}resolveWebviewView(e,t,s){this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this._extensionUri]},e.webview.html=this._getHtmlForWebview(e.webview),setTimeout(()=>{this.syncActiveModelSummary().catch(()=>{}),this.refreshPhases().catch(()=>{})},150),e.onDidChangeVisibility(()=>{e.visible&&(this.orchestrator?.getIsRunning()?this.refreshState().catch(()=>{}):this.refreshPhases().catch(()=>{}))}),e.webview.onDidReceiveMessage(async o=>{try{switch(o.type){case"saveConfig":{let n=Number(o.maxTokens)||32768,i=Number(o.timeoutSeconds)||600;this.client.updateConfig({provider:o.provider,model:o.model,apiKey:o.apiKey,baseUrl:o.baseUrl,maxTokens:n,timeoutSeconds:i}),o.apiKey?await this.context.secrets.store("tidyproteomicsagent.apiKey",o.apiKey):o.apiKey===""&&await this.context.secrets.delete("tidyproteomicsagent.apiKey");try{let l=m.workspace.getConfiguration("tidyproteomicsagent");await l.update("provider",o.provider,m.ConfigurationTarget.Global),await l.update("model",o.model,m.ConfigurationTarget.Global),await l.update("baseUrl",o.baseUrl,m.ConfigurationTarget.Global),await l.update("maxTokens",n,m.ConfigurationTarget.Global),await l.update("timeoutSeconds",i,m.ConfigurationTarget.Global)}catch{}await this.context.globalState.update("tidyproteomicsagent.provider",o.provider),await this.context.globalState.update("tidyproteomicsagent.model",o.model),await this.context.globalState.update("tidyproteomicsagent.baseUrl",o.baseUrl),await this.context.globalState.update("tidyproteomicsagent.maxTokens",n),await this.context.globalState.update("tidyproteomicsagent.timeoutSeconds",i),await this.syncActiveModelSummary(),o.silent||m.window.showInformationMessage("TidyProteomicsAgent: Configuration saved!");let a=await this.orchestrator?.getState();a&&this.sendStateUpdate(a);break}case"startPipeline":{if(!this.workspaceRoot){m.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let n=this.client.getConfig();if(n.provider!=="ollama"&&!n.apiKey){m.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}await this.syncActiveModelSummary(),this.orchestrator?.runFullPipeline().catch(i=>{m.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${i.message}`)});break}case"runPhase":{if(!this.workspaceRoot){m.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let n=this.client.getConfig();if(n.provider!=="ollama"&&!n.apiKey){m.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}await this.syncActiveModelSummary(),this.orchestrator?.runSinglePhase(o.phaseId).catch(i=>{m.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${i.message}`)});break}case"togglePhase":{this.orchestrator?.togglePhase(o.phaseId,o.enabled);break}case"stopPipeline":{this.orchestrator?.stop();break}case"forceReload":{await this.forceReload();break}case"resetState":{await this.resetAllState();break}case"openFile":{if(!this.workspaceRoot){m.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let n=o.relPath||"",i=u.isAbsolute(n)?n:u.join(this.workspaceRoot,n);try{w.existsSync(i)||(w.mkdirSync(u.dirname(i),{recursive:!0}),w.writeFileSync(i,"","utf-8"));let a=await m.workspace.openTextDocument(i);await m.window.showTextDocument(a)}catch(a){m.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${n}: ${a.message}`)}break}case"openPhase":{if(!this.workspaceRoot){m.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let n=o.fileName||"",i=n.includes("/")||n.includes("\\")?u.join(this.workspaceRoot,n):u.join(this.workspaceRoot,"analysis",n);try{let a=await m.workspace.openTextDocument(i);await m.window.showTextDocument(a)}catch(a){m.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${n}: ${a.message}`)}break}case"copyPath":{this.workspaceRoot&&(await m.env.clipboard.writeText(this.workspaceRoot),m.window.showInformationMessage("TidyProteomicsAgent: Workspace path copied to clipboard!"));break}case"revealInOS":{this.workspaceRoot&&await m.commands.executeCommand("revealFileInOS",m.Uri.file(this.workspaceRoot));break}case"selectDirectory":{let n=await m.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder"});if(n&&n.length>0){let i=n[0].fsPath;this.customWorkspaceRoot=i,this.workspaceRoot=i,this.tools.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),await this.refreshPhases(),await this.syncActiveModelSummary(),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),m.window.showInformationMessage(`TidyProteomicsAgent: Active directory set to ${this.workspaceRoot}`)}break}case"rescanWorkspace":{await this.onWorkspaceChanged(),m.window.showInformationMessage("TidyProteomicsAgent: Rescanned workspace folders and phases.");break}case"createMissingFolders":{if(!this.workspaceRoot){m.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let n=["analysis","agent","code","data",u.join("data","raw"),"docs","logs","tools"];for(let i of n){let a=u.join(this.workspaceRoot,i);w.existsSync(a)||w.mkdirSync(a,{recursive:!0})}await this.refreshPhases(),m.window.showInformationMessage("TidyProteomicsAgent: Standard project folders initialized!");break}case"initWorkspace":{await this.initWorkspace(o.pipelineId||"differential_expression");break}case"promptInitWorkspace":{await this.promptInitWorkspace();break}case"requestState":{await this.refreshState();break}}}catch(n){m.window.showErrorMessage(`TidyProteomicsAgent Error: ${n.message}`)}})}async promptInitWorkspace(){if(!this.workspaceRoot){let s=await m.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder to Initialize"});if(s&&s.length>0)this.workspaceRoot=s[0].fsPath,this.customWorkspaceRoot=this.workspaceRoot,this.tools.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),await this.syncActiveModelSummary();else return}let e=[{label:"$(symbol-structure) Differential Expression Pipeline",description:"Full 5-phase workflow (QC, Normalization, Differential Expression, Observations, Report)",id:"differential_expression"},{label:"$(graph) Quality Control & Exploration Pipeline",description:"2-phase rapid QC and exploratory data analysis",id:"quality_control_only"}],t=await m.window.showQuickPick(e,{placeHolder:"Select a pipeline template to initialize this workspace"});t&&await this.initWorkspace(t.id)}async initWorkspace(e="differential_expression"){if(!this.workspaceRoot){let t=await m.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder to Initialize"});if(t&&t.length>0)this.workspaceRoot=t[0].fsPath,this.customWorkspaceRoot=this.workspaceRoot,this.tools.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),await this.syncActiveModelSummary();else return m.window.showErrorMessage("TidyProteomicsAgent: Please open or select a workspace folder first."),!1}try{let s=[u.join(this._extensionUri.fsPath,"templates"),u.join(this._extensionUri.fsPath,"extension","templates"),u.join(this.context.extensionPath,"templates"),u.join(this.context.extensionPath,"extension","templates"),u.join(__dirname,"..","templates"),u.join(__dirname,"..","..","templates"),u.join(__dirname,"templates"),u.join(this.workspaceRoot,"extension","templates"),u.join(this.workspaceRoot,"templates")].find(r=>w.existsSync(r));if(!s)return m.window.showErrorMessage("TidyProteomicsAgent: Template directory not found in extension or workspace."),!1;let o=["analysis","agent","code","data",u.join("data","raw"),"docs","logs","tools"];for(let r of o){let c=u.join(this.workspaceRoot,r);w.existsSync(c)||w.mkdirSync(c,{recursive:!0})}let n=(r,c,f=!1)=>{w.existsSync(r)&&(f||!w.existsSync(c))&&(w.mkdirSync(u.dirname(c),{recursive:!0}),w.copyFileSync(r,c))},i=u.join(s,"shared");w.existsSync(i)&&(n(u.join(i,"code","00_environment.R"),u.join(this.workspaceRoot,"code","00_environment.R"),!0),n(u.join(i,"tools","lint_tidyproteomics.R"),u.join(this.workspaceRoot,"tools","lint_tidyproteomics.R"),!0),n(u.join(i,"agent","PROTOCOL.md"),u.join(this.workspaceRoot,"agent","PROTOCOL.md"),!0),n(u.join(i,"agent","SKILL.md"),u.join(this.workspaceRoot,"agent","SKILL.md"),!0),n(u.join(i,"docs","experiment.md"),u.join(this.workspaceRoot,"docs","experiment.md"),!1),n(u.join(i,"docs","notes.md"),u.join(this.workspaceRoot,"docs","notes.md"),!1),n(u.join(i,"docs","concept.md"),u.join(this.workspaceRoot,"docs","concept.md"),!1),n(u.join(i,".gitignore"),u.join(this.workspaceRoot,".gitignore"),!1),n(u.join(i,"logs",".gitkeep"),u.join(this.workspaceRoot,"logs",".gitkeep"),!1),n(u.join(i,"data","raw",".gitkeep"),u.join(this.workspaceRoot,"data","raw",".gitkeep"),!1));let a=u.join(s,"pipelines",e);if(w.existsSync(a)||(a=u.join(s,"pipelines","differential_expression")),w.existsSync(a)){let r=w.readdirSync(a).filter(c=>c.endsWith(".md"));for(let c of r)n(u.join(a,c),u.join(this.workspaceRoot,"analysis",c),!0)}else m.window.showWarningMessage(`TidyProteomicsAgent: Pipeline templates not found in ${s}/pipelines.`);await this.syncActiveModelSummary(),await this.refreshPhases();let l=await this.orchestrator?.getState();l&&this.sendStateUpdate(l);let h=e==="quality_control_only"?"Quality Control & Exploration":"Standard Differential Expression";m.window.showInformationMessage(`TidyProteomicsAgent: Workspace initialized with ${h} pipeline!`);let p=u.join(this.workspaceRoot,"docs","experiment.md");if(w.existsSync(p))try{let r=await m.workspace.openTextDocument(p);await m.window.showTextDocument(r)}catch{}return!0}catch(t){return m.window.showErrorMessage(`TidyProteomicsAgent: Failed to initialize workspace - ${t.message}`),!1}}startPipeline(){this.syncActiveModelSummary().catch(()=>{}),this.orchestrator?.runFullPipeline().catch(e=>{m.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${e.message}`)})}async runSelectedPhase(){if(!this.workspaceRoot){m.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let e=this.client.getConfig();if(e.provider!=="ollama"&&!e.apiKey){m.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}if(await this.syncActiveModelSummary(),!this.orchestrator)return;let t=this.orchestrator.getPhases();if(t.length===0){m.window.showInformationMessage("TidyProteomicsAgent: No phases found to run.");return}let s=t.find(i=>i.status==="running")||t.find(i=>i.status==="pending"&&i.enabled!==!1)||t[0],o=t.map(i=>({label:i.title,description:`(${i.fileName}) - ${i.status.toUpperCase()}`,phaseId:i.id,picked:i.id===s?.id})),n=await m.window.showQuickPick(o,{placeHolder:"Select phase to run in isolation"});n&&this.orchestrator.runSinglePhase(n.phaseId).catch(i=>{m.window.showErrorMessage(`TidyProteomicsAgent: Error running phase - ${i.message}`)})}sendStateUpdate(e){if(this._view&&this._view.webview)try{let t=this._view.webview.postMessage({type:"stateUpdate",state:e});t&&typeof t.then=="function"&&t.then(void 0,s=>{console.warn("[SidebarViewProvider] Failed to post stateUpdate:",s)})}catch(t){console.warn("[SidebarViewProvider] Exception posting stateUpdate:",t)}}sendLog(e){if(this._view&&this._view.webview)try{let t=this._view.webview.postMessage({type:"log",text:e});t&&typeof t.then=="function"&&t.then(void 0,s=>{console.warn("[SidebarViewProvider] Failed to post log:",s)})}catch(t){console.warn("[SidebarViewProvider] Exception posting log:",t)}}escapeAttr(e){return String(e||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}_cachedIcons;_loadIcons(){let e={},t=u.join(this._extensionUri.fsPath,"media");try{if(w.existsSync(t)){let s=w.readdirSync(t);for(let o of s)if(o.endsWith(".svg")){let n=o.replace(".svg",""),i=w.readFileSync(u.join(t,o),"utf-8");i=i.replace(/<\?xml[^>]*\?>/g,"").trim(),i=i.replace(/\s(width|height)="[^"]*"/g,""),n==="robot"?i=i.replace("<svg ",`<svg class="svg-icon svg-icon-${n}" `):i=i.replace("<svg ",`<svg class="svg-icon svg-icon-${n}" fill="currentColor" `),e[n]=i}}}catch(s){console.error("[SidebarViewProvider] Error loading SVG icons:",s)}return e}_getIcons(){return this._cachedIcons||(this._cachedIcons=this._loadIcons()),this._cachedIcons}_getHtmlForWebview(e){let t=this.client.getConfig(),s=this._getIcons();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; img-src https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TidyProteomicsAgent</title>
  <style>
    :root {
      --bg: var(--vscode-sideBar-background, #18181b);
      --fg: var(--vscode-sideBar-foreground, #e4e4e7);
      --card-bg: var(--vscode-editor-background, #27272a);
      --border: var(--vscode-widget-border, rgba(127, 127, 127, 0.25));
      --primary: var(--vscode-button-background, #3b82f6);
      --primary-hover: var(--vscode-button-hoverBackground, #2563eb);
      --success: #10b981;
      --warning: #f59e0b;
      --error: var(--vscode-errorForeground, #ef4444);
      --cached: #8b5cf6;
      --muted: var(--vscode-descriptionForeground, #a1a1aa);
      --terminal-bg: var(--vscode-terminal-background, #09090b);
      --terminal-fg: var(--vscode-terminal-foreground, #22c55e);
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html {
      height: 100%;
    }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      font-size: 12px;
      color: var(--fg);
      background-color: var(--bg);
      padding: 10px;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
    }
    h2, h3, h4 { font-weight: 600; margin-bottom: 4px; }
    
    /* Top Header Bar */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ws-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      color: #93c5fd;
      cursor: pointer;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .ws-chip:hover {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.15);
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .badge-pending { background: #52525b; color: #fff; }
    .badge-queued { background: #6366f1; color: #fff; }
    .badge-running { background: var(--primary); color: #fff; animation: pulse 1.5s infinite; }
    .badge-completed { background: var(--success); color: #fff; }
    .badge-failed { background: var(--error); color: #fff; }
    .badge-cached { background: var(--cached); color: #fff; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Segmented Tab Bar */
    .tab-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 3px;
      margin-bottom: 12px;
      gap: 3px;
      flex: 0 0 auto;
    }
    .tab-bar button.tab-btn {
      background: transparent !important;
      color: var(--muted) !important;
      border: none !important;
      border-radius: 4px !important;
      padding: 6px 2px !important;
      cursor: pointer;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 2px !important;
      transition: all 0.15s ease;
      position: relative;
      width: 100% !important;
      box-shadow: none !important;
      font-weight: normal !important;
    }
    .tab-bar button.tab-btn:hover {
      color: var(--fg) !important;
      background: rgba(255, 255, 255, 0.08) !important;
    }
    .tab-bar button.tab-btn.active {
      color: #ffffff !important;
      background: var(--primary) !important;
      font-weight: 600 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
    }
    .tab-icon {
      font-size: 13px;
      line-height: 1;
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .tab-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }
    .tab-indicator {
      position: absolute;
      top: 3px;
      right: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: none;
      pointer-events: none;
    }
    .tab-indicator.running {
      display: block;
      background: var(--success);
      animation: pulse 1.5s infinite;
    }
    .tab-indicator.alert {
      display: block;
      background: var(--warning);
    }

    /* Tab Panes */
    .tab-pane {
      display: none;
      animation: fadeIn 0.15s ease;
    }
    .tab-pane.active {
      display: block !important;
    }
    #pane-pipeline.active {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Containers & Cards */
    .section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .terminal-section {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 150px;
      margin-bottom: 0 !important;
    }
    .terminal-section .section-header {
      flex: 0 0 auto;
    }
    .terminal-section .terminal {
      flex: 1 1 auto;
      height: 100%;
      min-height: 110px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .section-desc {
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .form-group {
      margin-bottom: 8px;
    }
    label {
      display: block;
      font-size: 10px;
      margin-bottom: 3px;
      color: var(--muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    input, select {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
      outline: none;
    }
    input:focus, select:focus {
      border-color: var(--primary);
    }

    /* Buttons */
    button {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: background 0.15s;
    }
    button:hover { background: var(--primary-hover); }
    button.btn-stop { background: var(--error); }
    button.btn-stop:hover { background: #dc2626; }
    button.btn-secondary {
      background: #3f3f46;
      color: #fff;
    }
    button.btn-secondary:hover {
      background: #52525b;
    }
    button.btn-sm {
      padding: 3px 8px;
      font-size: 10px;
      background: #3f3f46;
    }
    button.btn-sm:hover {
      background: #52525b;
    }
    button.btn-icon {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--muted);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 12px;
      line-height: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    button.btn-icon:hover {
      color: var(--fg);
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.15);
    }

    /* Analysis Task Cards */
    .task-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 6px 8px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .task-card:hover {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(255, 255, 255, 0.02);
    }
    .task-card.running {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.08);
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.25);
    }
    .task-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .task-left input[type="checkbox"] {
      width: 13px;
      height: 13px;
      cursor: pointer;
      accent-color: var(--primary);
      margin: 0;
      flex-shrink: 0;
    }
    .task-name {
      font-weight: 600;
      font-size: 11px;
      font-family: var(--vscode-editor-font-family, monospace);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      color: var(--fg);
      letter-spacing: 0.2px;
    }
    .task-name:hover {
      color: var(--primary);
      text-decoration: underline;
    }
    .task-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .btn-run {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 3px;
      padding: 2px 7px;
      font-size: 9.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      line-height: 1.2;
      transition: all 0.15s ease;
    }
    .btn-run:hover:not(:disabled) {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }
    .btn-run:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      pointer-events: none;
      background: transparent;
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--muted);
    }
    .task-duration {
      font-size: 9.5px;
      font-family: var(--vscode-editor-font-family, monospace);
      color: var(--muted);
      min-width: 32px;
      text-align: right;
    }

    /* File Cards (Memory & Protocol) */
    .file-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 5px;
      font-size: 11px;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .file-card:hover {
      border-color: var(--primary);
      background: rgba(59, 130, 246, 0.08);
    }
    .file-title {
      font-weight: 600;
      font-size: 11px;
    }
    .file-path {
      font-size: 9px;
      color: var(--muted);
      font-family: monospace;
    }

    /* Folder Status Cards (Active Directory) */
    .folder-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .folder-name {
      font-weight: 600;
      font-size: 11px;
      color: #93c5fd;
      font-family: monospace;
    }
    .folder-desc {
      font-size: 9px;
      color: var(--muted);
    }

    /* Info Callout */
    .callout {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 5px;
      padding: 8px;
      margin-top: 8px;
      font-size: 10px;
      line-height: 1.4;
      color: #bfdbfe;
    }
    .callout b {
      color: #ffffff;
    }

    /* Tokens Table */
    .tokens-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 4px;
    }
    .tokens-table th,
    .tokens-table td {
      text-align: center;
      padding: 5px 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tokens-table th {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.4px;
      color: var(--muted);
      background: rgba(127, 127, 127, 0.08);
      border-bottom: 1px solid var(--border);
    }
    .tokens-table td {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary);
      font-variant-numeric: tabular-nums;
      padding: 6px 2px;
    }
    .tokens-table th:not(:last-child),
    .tokens-table td:not(:last-child) {
      border-right: 1px solid var(--border);
    }

    /* Live Feed Terminal */
    .terminal {
      background: var(--terminal-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 8px;
      overflow: auto;
      font-family: var(--vscode-editor-font-family, "SF Mono", Monaco, Consolas, monospace);
      font-size: 10.5px;
      line-height: 1.5;
      white-space: pre;
      word-break: normal;
      color: var(--terminal-fg);
      flex: 1 1 auto;
      height: 100%;
      min-height: 110px;
    }

    /* Status Pill */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--bg);
      border: 1px solid var(--border);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .dot-green { background: var(--success); }
    .dot-gray { background: #71717a; }

    /* Theme-Adaptive SVG Icons from extension/media */
    .svg-icon {
      display: inline-block;
      width: 13px;
      height: 13px;
      vertical-align: -2px;
      fill: currentColor;
      flex-shrink: 0;
    }
    .svg-icon-robot {
      fill: none !important;
      stroke: currentColor;
    }
    .tab-icon .svg-icon {
      width: 15px;
      height: 15px;
      vertical-align: middle;
    }
    h2 .svg-icon {
      width: 15px;
      height: 15px;
      vertical-align: -2px;
      margin-right: 4px;
    }
    h3 .svg-icon {
      width: 13px;
      height: 13px;
      vertical-align: -2px;
      margin-right: 4px;
    }
    button .svg-icon {
      width: 12px;
      height: 12px;
      vertical-align: -1px;
    }
    .btn-run .svg-icon {
      width: 9px;
      height: 9px;
      vertical-align: -1px;
      margin-right: 2px;
    }
    .callout b {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .callout b .svg-icon {
      width: 12px;
      height: 12px;
      vertical-align: -1px;
    }
    .ws-chip .svg-icon {
      width: 11px;
      height: 11px;
      vertical-align: -1px;
    }
    .badge .svg-icon {
      width: 9px;
      height: 9px;
      vertical-align: -1px;
      margin-left: 2px;
    }
    .tokens-table th .svg-icon {
      width: 10px;
      height: 10px;
      vertical-align: -1px;
    }
    .spin {
      display: inline-block;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <!-- Header Bar -->
  <div class="header">
    <div class="header-left">
      <h2>${s.robot||""} TidyProteomicsAgent</h2>
      <span class="badge badge-completed" id="pipelineHeaderBadge">IDLE</span>
    </div>
    <div class="ws-chip" id="wsChip" title="Click to view Active Directory">
      <span>${s["folder-open"]||""}</span>
      <span id="wsChipName">Project</span>
    </div>
  </div>

  <!-- Segmented Tab Navigation -->
  <div class="tab-bar">
    <button type="button" class="tab-btn active" data-tab="pipeline" onclick="window.switchTab && window.switchTab('pipeline')" title="Pipeline execution, phases & live feed">
      <span class="tab-icon">${s["rocket-lunch"]||""}</span>
      <span class="tab-label">Pipeline</span>
      <span class="tab-indicator" id="pipelineIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="blackboard" onclick="window.switchTab && window.switchTab('blackboard')" title="Memory notes, protocol & chat log">
      <span class="tab-icon">${s.ftp||""}</span>
      <span class="tab-label">Memory</span>
    </button>
    <button type="button" class="tab-btn" data-tab="provider" onclick="window.switchTab && window.switchTab('provider')" title="LLM Provider, model & API key">
      <span class="tab-icon">${s.cube||""}</span>
      <span class="tab-label">Provider</span>
      <span class="tab-indicator" id="providerIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="directory" onclick="window.switchTab && window.switchTab('directory')" title="Active directory & workspace folder status">
      <span class="tab-icon">${s["folder-open"]||""}</span>
      <span class="tab-label">Directory</span>
      <span class="tab-indicator" id="dirIndicator"></span>
    </button>
  </div>

  <!-- TAB 1: PIPELINE -->
  <div class="tab-pane active" id="pane-pipeline">
    <!-- Pipeline Execution Controls -->
    <div class="section">
      <div style="display:flex; gap:4px; margin-bottom:8px;">
        <button id="startPipelineBtn" style="width:100%;">${s.play||""} Run Active Pipeline</button>
        <button id="stopBtn" class="btn-stop" style="display:none; width:100%;">${s.stop||""} Stop Pipeline</button>
      </div>

      <div class="section-header">
        <div style="display:flex; align-items:center; gap:6px;">
          <h3>${s["rocket-lunch"]||""} Analysis Tasks</h3>
          <button type="button" id="refreshTasksBtn" class="btn-icon" title="Reload tasks and sync progress from disk">${s.refresh||"\u21BB"}</button>
        </div>
        <span style="font-size:9px; color:var(--muted);" id="phaseCountLabel">0 Tasks</span>
      </div>
      <div class="section-desc">Select tasks to execute. Click task name to edit in VS Code.</div>

      <!-- Dynamic Phase Checklist -->
      <div id="phaseContainer">
        <div style="text-align:center; padding:10px; color:var(--muted);">Loading phases...</div>
      </div>
    </div>

    <!-- Tokens -->
    <div class="section">
      <div class="section-header">
        <h3>${s.coins||""} Tokens</h3>
      </div>
      <table class="tokens-table">
        <thead>
          <tr>
            <th>Prompt</th>
            <th>Cached ${s.sparkles||""}</th>
            <th>Response</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td id="promptTokens">0</td>
            <td id="cachedTokens" style="color:var(--success);">0</td>
            <td id="responseTokens">0</td>
            <td id="totalTokens">0</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Live Sub-Loop Terminal Feed -->
    <div class="section terminal-section">
      <div class="section-header">
        <h3>${s.terminal||""} Sub-Loop Live Feed</h3>
        <div style="display:flex; gap:4px;">
          <button class="btn-sm" id="viewChatLogBtn" title="Open logs/llm_chat.md in VS Code">${s.list||""} Chat Log</button>
          <button class="btn-sm" id="clearLogBtn">Clear</button>
        </div>
      </div>
      <div class="terminal" id="terminalLog">TidyProteomicsAgent ready. Phases discovered from analysis/*.md.</div>
    </div>
  </div>

  <!-- TAB 2: MEMORY & PROTOCOL -->
  <div class="tab-pane" id="pane-blackboard">
    <!-- Persistent Global Context -->
    <div class="section">
      <div class="section-header">
        <h3>${s.globe||""} Global Context</h3>
        <span class="badge badge-cached">Cached Prefix</span>
      </div>
      <div class="section-desc">System instructions read at the start of every phase and cached in LLM memory.</div>
      <div id="globalFrameContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading global files...</div>
      </div>
    </div>

    <!-- Shared Memory -->
    <div class="section">
      <div class="section-header">
        <h3>${s.ftp||""} Shared Memory</h3>
        <span class="badge badge-completed">Disk State</span>
      </div>
      <div class="section-desc">Cross-phase state on disk. Sub-loops update this scratchpad after each run.</div>
      <div id="blackboardContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading memory files...</div>
      </div>
    </div>

    <!-- Logs -->
    <div class="section">
      <div class="section-header">
        <h3>${s["list-check"]||""} Logs</h3>
      </div>
      <div class="section-desc">Lean audit trail capturing assistant thoughts, tool executions, and tokens.</div>
      <div id="logsContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading logs...</div>
      </div>
    </div>

    <!-- Architecture Callout -->
    <div class="callout">
      <b>${s.info||""} TidyProteomicsAgent Architecture:</b><br>
      \u2022 <b>Global Context</b> (<code>agent/</code>) is cached across phases to slash token costs.<br>
      \u2022 <b>Ephemeral Sub-Loops</b> run in isolation for each phase, preventing context bloat.<br>
      \u2022 <b>Shared Memory</b> (<code>docs/notes.md</code>) passes findings between phases.
    </div>
  </div>

  <!-- TAB 3: LLM PROVIDER -->
  <div class="tab-pane" id="pane-provider">
    <div class="section">
      <div class="section-header">
        <h3>${s.cube||""} Provider Configuration</h3>
        <button class="btn-sm" id="saveConfigBtn">Save Settings</button>
      </div>

      <div class="form-group">
        <label>Provider</label>
        <select id="providerSelect">
          <option value="anthropic" ${t.provider==="anthropic"?"selected":""}>Anthropic (Prompt Caching)</option>
          <option value="openrouter" ${t.provider==="openrouter"?"selected":""}>OpenRouter (Unified Gateway)</option>
          <option value="ollama" ${t.provider==="ollama"?"selected":""}>Remote Hosted Ollama</option>
          <option value="gemini" ${t.provider==="gemini"?"selected":""}>Google Gemini</option>
          <option value="openai" ${t.provider==="openai"?"selected":""}>OpenAI</option>
        </select>
      </div>

      <div class="form-group" id="baseUrlGroup">
        <label id="baseUrlLabel">Base URL / Endpoint</label>
        <input type="text" id="baseUrlInput" value="${this.escapeAttr(t.baseUrl||"")}" placeholder="http://remote-host:11434/v1" />
        <span id="baseUrlHint" style="font-size:9px; color:var(--muted); display:block; margin-top:2px;"></span>
      </div>

      <div class="form-group">
        <label id="modelLabel">Model ID</label>
        <input type="text" id="modelInput" value="${this.escapeAttr(t.model||"")}" placeholder="claude-3-7-sonnet-20250219" />
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="apiKeyLabel">API Key</label>
          <span id="toggleKeyVisibility" style="font-size:9px; color:var(--primary); cursor:pointer;">Show</span>
        </div>
        <input type="password" id="apiKeyInput" value="${this.escapeAttr(t.apiKey||"")}" placeholder="sk-..." />
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="maxTokensLabel">Max Output Tokens</label>
          <span style="font-size:9px; color:var(--muted);">Default: 32,768</span>
        </div>
        <select id="maxTokensSelect">
          <option value="4096" ${t.maxTokens===4096?"selected":""}>4,096 (Standard / Minimal)</option>
          <option value="8192" ${t.maxTokens===8192?"selected":""}>8,192</option>
          <option value="16384" ${t.maxTokens===16384?"selected":""}>16,384 (Recommended for Reports)</option>
          <option value="32768" ${t.maxTokens===32768||!t.maxTokens?"selected":""}>32,768 (Full Manuscripts / Long Synthesis)</option>
          <option value="65536" ${t.maxTokens===65536?"selected":""}>65,536</option>
          <option value="128000" ${t.maxTokens===128e3?"selected":""}>128,000 (OpenRouter Frontier / Luna Max)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents tool call JSON truncation during long file generation (e.g. docs/scientific_report.md).</span>
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="timeoutSecondsLabel">Request Timeout</label>
          <span style="font-size:9px; color:var(--muted);">Default: 600s (10m)</span>
        </div>
        <select id="timeoutSecondsSelect">
          <option value="180" ${t.timeoutSeconds===180?"selected":""}>180s (3m - Fast Cloud Models)</option>
          <option value="300" ${t.timeoutSeconds===300?"selected":""}>300s (5m - Standard)</option>
          <option value="600" ${t.timeoutSeconds===600||!t.timeoutSeconds?"selected":""}>600s (10m - Recommended for Large / Local Models)</option>
          <option value="900" ${t.timeoutSeconds===900?"selected":""}>900s (15m - Extended Reasoning / Heavy Synthesis)</option>
          <option value="1200" ${t.timeoutSeconds===1200?"selected":""}>1,200s (20m - Ultra Long / Slow Local Inference)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents timeout abortions during complex phases or slow local inference (e.g. 70B models).</span>
      </div>

      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
        <span id="saveStatus" style="font-size:10px; color:var(--success); display:none;">\u2713 Settings saved!</span>
      </div>
    </div>

    <!-- Active Provider Summary Card -->
    <div class="section">
      <div class="section-header">
        <h3>${s.stats||""} Active Model Summary</h3>
        <button class="icon-btn" data-action="openFile" data-path="docs/llm.md" title="Open docs/llm.md" style="font-size:10px; padding:2px 6px;">docs/llm.md \u2197</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Provider:</span>
          <b id="summaryProvider">${(t.provider||"anthropic").toUpperCase()}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Model:</span>
          <b id="summaryModel" style="font-family:monospace;">${t.model}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Prompt Caching:</span>
          <span id="summaryCaching" class="badge badge-cached">Active ${s.sparkles||""}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Max Output Tokens:</span>
          <b id="summaryMaxTokens" style="font-family:monospace;">${(t.maxTokens||32768).toLocaleString()}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Request Timeout:</span>
          <b id="summaryTimeout" style="font-family:monospace;">${t.timeoutSeconds||600}s</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Key Status:</span>
          <span id="summaryKeyStatus" class="badge ${t.apiKey?"badge-completed":"badge-failed"}">${t.apiKey?"Configured":"Missing"}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 4: ACTIVE DIRECTORY -->
  <div class="tab-pane" id="pane-directory">
    <!-- Active Workspace Card -->
    <div class="section">
      <div class="section-header">
        <h3>${s["folder-open"]||""} Active VS Code Workspace</h3>
      </div>
      <div class="section-desc">TidyProteomicsAgent automatically operates within the folder currently opened in VS Code.</div>

      <div style="background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:8px; margin-bottom:8px;">
        <div id="dirWsName" style="font-weight:600; font-size:12px; color:#93c5fd; margin-bottom:2px;">Checking workspace...</div>
        <div id="dirWsPath" style="font-size:9px; color:var(--muted); font-family:monospace; word-break:break-all;"></div>
      </div>

      <div style="display:flex; gap:6px;">
        <button type="button" class="btn-secondary btn-sm" id="copyPathBtn" style="flex:1;">${s.list||""} Copy Path</button>
        <button type="button" class="btn-secondary btn-sm" id="revealOSBtn" style="flex:1;">${s["folder-open"]||""} Reveal in OS</button>
        <button type="button" class="btn-secondary btn-sm" id="chooseDirBtn" style="flex:1;">${s["folder-open"]||""} Choose Folder...</button>
      </div>
    </div>

    <!-- Project Structure Health Check -->
    <div class="section">
      <div class="section-header">
        <h3>${s.database||""} Project Structure Health</h3>
      </div>
      <div class="section-desc">Standard directories required for autonomous pipelines:</div>

      <div id="foldersListContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Scanning folders...</div>
      </div>

      <div style="display:flex; gap:6px; margin-top:8px;">
        <button type="button" class="btn-secondary btn-sm" id="rescanDirBtn" style="flex:1;">${s.refresh||""} Rescan</button>
        <button type="button" class="btn-sm" id="createFoldersBtn" style="flex:1;">${s["folder-open"]||""} Create Folders</button>
      </div>
      <div style="margin-top:6px;">
        <button type="button" class="btn-primary btn-sm" id="initPipelineQuickBtn" style="width:100%; padding:6px; font-weight:600;">${s.sparkles||""} Initialize Pipeline Scaffolding...</button>
      </div>
    </div>

    <!-- Guidance Note on Changing Workspace -->
    <div class="callout" style="line-height:1.5;">
      <b>${s.info||""} How to Change Analysis Folders:</b><br>
      \u2022 <b>Option 1 (Recommended in-window):</b> Click <b>${s["folder-open"]||""} Choose Folder...</b> above. This switches the active project instantly without restarting the window.<br>
      \u2022 <b>Option 2:</b> In VS Code, use <b>File &gt; Add Folder to Workspace...</b> to mount your dataset folder into the Explorer.<br>
      <div style="margin-top:6px; padding:6px; background:rgba(239, 68, 68, 0.1); border-left:3px solid var(--error); border-radius:3px; font-size:10px; color:#fca5a5;">
        <b>${s.alert||""} Debug Window Note:</b> When debugging this extension (F5), do <b>not</b> use <i>File &gt; Open Folder...</i> because VS Code restarts the window and terminates the debug session. Use <b>Choose Folder...</b> or <b>Add Folder to Workspace...</b> instead.
      </div>
    </div>
  </div>

  <script>
    // Global Error Logger for diagnostics
    window.addEventListener("error", function (e) {
      console.error("[TidyProteomicsAgent Webview Error]", e.error || e.message);
      try {
        if (window.vscode) window.vscode.postMessage({ type: "log", text: "[Webview Error] " + (e.error?.message || e.message) });
      } catch (_) {}
    });

    const vscode = acquireVsCodeApi();
    window.vscode = vscode;
    const ICONS = ${JSON.stringify(s)};

    // Tab Switching Logic (Defined first so it is available globally immediately)
    function switchTab(tabId) {
      if (!tabId) return;
      try {
        const tabs = document.querySelectorAll(".tab-btn");
        const panes = document.querySelectorAll(".tab-pane");

        tabs.forEach(function (t) {
          if (t.getAttribute("data-tab") === tabId) {
            t.classList.add("active");
          } else {
            t.classList.remove("active");
          }
        });

        panes.forEach(function (p) {
          if (p.id === "pane-" + tabId) {
            p.classList.add("active");
            p.style.display = "block";
          } else {
            p.classList.remove("active");
            p.style.display = "none";
          }
        });

        try {
          const current = vscode.getState() || {};
          vscode.setState(Object.assign({}, current, { activeTab: tabId }));
        } catch (_) {}
      } catch (err) {
        console.error("[TidyProteomicsAgent] Error in switchTab:", err);
      }
    }
    window.switchTab = switchTab;

    // Restore saved tab or default to 'pipeline'
    try {
      const savedState = vscode.getState();
      const initialTab = (savedState && savedState.activeTab) ? savedState.activeTab : "pipeline";
      switchTab(initialTab);
    } catch (_) {
      switchTab("pipeline");
    }

    // Elements
    const pipelineHeaderBadge = document.getElementById("pipelineHeaderBadge");
    const wsChip = document.getElementById("wsChip");
    const wsChipName = document.getElementById("wsChipName");

    const pipelineIndicator = document.getElementById("pipelineIndicator");
    const providerIndicator = document.getElementById("providerIndicator");
    const dirIndicator = document.getElementById("dirIndicator");

    const startPipelineBtn = document.getElementById("startPipelineBtn");
    const stopBtn = document.getElementById("stopBtn");
    const phaseContainer = document.getElementById("phaseContainer");
    const phaseCountLabel = document.getElementById("phaseCountLabel");
    const refreshTasksBtn = document.getElementById("refreshTasksBtn");

    const promptTokensEl = document.getElementById("promptTokens");
    const cachedTokensEl = document.getElementById("cachedTokens");
    const responseTokensEl = document.getElementById("responseTokens");
    const totalTokensEl = document.getElementById("totalTokens");

    const terminalLog = document.getElementById("terminalLog");
    const clearLogBtn = document.getElementById("clearLogBtn");
    const viewChatLogBtn = document.getElementById("viewChatLogBtn");

    const globalFrameContainer = document.getElementById("globalFrameContainer");
    const blackboardContainer = document.getElementById("blackboardContainer");
    const logsContainer = document.getElementById("logsContainer");

    const providerSelect = document.getElementById("providerSelect");
    const modelInput = document.getElementById("modelInput");
    const apiKeyInput = document.getElementById("apiKeyInput");
    const apiKeyLabel = document.getElementById("apiKeyLabel");
    const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");
    const maxTokensSelect = document.getElementById("maxTokensSelect");
    const timeoutSecondsSelect = document.getElementById("timeoutSecondsSelect");
    const baseUrlGroup = document.getElementById("baseUrlGroup");
    const baseUrlInput = document.getElementById("baseUrlInput");
    const baseUrlLabel = document.getElementById("baseUrlLabel");
    const baseUrlHint = document.getElementById("baseUrlHint");
    const saveConfigBtn = document.getElementById("saveConfigBtn");
    const saveStatus = document.getElementById("saveStatus");

    const summaryProvider = document.getElementById("summaryProvider");
    const summaryModel = document.getElementById("summaryModel");
    const summaryCaching = document.getElementById("summaryCaching");
    const summaryMaxTokens = document.getElementById("summaryMaxTokens");
    const summaryTimeout = document.getElementById("summaryTimeout");
    const summaryKeyStatus = document.getElementById("summaryKeyStatus");

    const dirWsName = document.getElementById("dirWsName");
    const dirWsPath = document.getElementById("dirWsPath");
    const copyPathBtn = document.getElementById("copyPathBtn");
    const revealOSBtn = document.getElementById("revealOSBtn");
    const chooseDirBtn = document.getElementById("chooseDirBtn");
    const foldersListContainer = document.getElementById("foldersListContainer");
    const rescanDirBtn = document.getElementById("rescanDirBtn");
    const createFoldersBtn = document.getElementById("createFoldersBtn");

    // Unified Click Handler via event delegation
    document.addEventListener("click", function (e) {
      if (!e.target) return;

      // Tab Buttons
      const tabBtn = e.target.closest ? e.target.closest(".tab-btn") : null;
      if (tabBtn) {
        const tab = tabBtn.getAttribute("data-tab");
        if (tab) switchTab(tab);
        return;
      }

      // Workspace Chip
      if (e.target.closest && e.target.closest("#wsChip")) {
        switchTab("directory");
        return;
      }

      // Initialize Workspace Button
      const initBtn = e.target.closest ? e.target.closest("#initWorkspaceBtn, [data-action='initWorkspace']") : null;
      if (initBtn) {
        const select = document.getElementById("pipelineTemplateSelect");
        const pipelineId = select ? select.value : "differential_expression";
        initBtn.setAttribute("disabled", "true");
        initBtn.innerHTML = '<span class="spin">' + (ICONS["refresh"] || "") + '</span> Initializing...';
        vscode.postMessage({ type: "initWorkspace", pipelineId: pipelineId });
        return;
      }

      // Dynamic data-actions (runPhase, openPhase, openFile)
      const target = e.target.closest ? e.target.closest("[data-action]") : null;
      if (target) {
        const action = target.getAttribute("data-action");
        if (action === "runPhase") {
          const phaseId = target.getAttribute("data-id");
          if (phaseId) vscode.postMessage({ type: "runPhase", phaseId: phaseId });
        } else if (action === "openPhase") {
          const fileName = target.getAttribute("data-file");
          if (fileName) vscode.postMessage({ type: "openPhase", fileName: fileName });
        } else if (action === "openFile") {
          const relPath = target.getAttribute("data-path");
          if (relPath) vscode.postMessage({ type: "openFile", relPath: relPath });
        }
        return;
      }
    });

    // Checkbox Toggle for Phases and Pipeline Template Change
    document.addEventListener("change", function (e) {
      if (e.target && e.target.matches && e.target.matches("input[type='checkbox'][data-phase-id]")) {
        const phaseId = e.target.getAttribute("data-phase-id");
        vscode.postMessage({ type: "togglePhase", phaseId: phaseId, enabled: e.target.checked });
      } else if (e.target && e.target.id === "pipelineTemplateSelect") {
        const descEl = document.getElementById("pipelineDescription");
        const selectEl = e.target;
        if (descEl) {
          if (selectEl.value === "quality_control_only") {
            descEl.innerHTML = "<b>Phases:</b> 00_SETUP \u2794 01_DATA_QUALITY.<br><i>Includes: Workspace readiness, data import, replicate CV analysis, quantifiable fraction evaluation, and PCA separation.</i>";
          } else {
            descEl.innerHTML = "<b>Phases:</b> 00_SETUP \u2794 01_DATA_QUALITY \u2794 02_EXPRESSION \u2794 03_OBSERVATIONS \u2794 04_SYNTHESIS.<br><i>Includes: QC, normalization, imputation, differential expression, observation notes, and synthesis report.</i>";
          }
        }
      }
    });

    // Key Visibility Toggle
    if (toggleKeyVisibility && apiKeyInput) {
      toggleKeyVisibility.addEventListener("click", () => {
        if (apiKeyInput.type === "password") {
          apiKeyInput.type = "text";
          toggleKeyVisibility.textContent = "Hide";
        } else {
          apiKeyInput.type = "password";
          toggleKeyVisibility.textContent = "Show";
        }
      });
    }

    // Provider UI updates
    function updateProviderUI(isUserChange) {
      if (!providerSelect) return;
      const prov = providerSelect.value;
      if (baseUrlGroup) {
        if (prov === "ollama") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "Remote Ollama Base URL";
          if (baseUrlInput) baseUrlInput.placeholder = "http://192.168.1.100:11434/v1";
          if (baseUrlHint) baseUrlHint.textContent = "Points to remote Ollama host. Suffix /v1 auto-added if omitted.";
          if (apiKeyLabel) apiKeyLabel.textContent = "API Key (Optional / Auth Proxy)";
          if (apiKeyInput) apiKeyInput.placeholder = "Leave blank if unauthenticated";
          if (modelInput) modelInput.placeholder = "llama3.3:70b";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gpt") || modelInput.value.startsWith("gemini"))) {
            modelInput.value = "llama3.3:70b";
          }
        } else if (prov === "openrouter") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "OpenRouter Endpoint URL";
          if (baseUrlInput) baseUrlInput.placeholder = "https://openrouter.ai/api/v1 (default)";
          if (baseUrlHint) baseUrlHint.textContent = "Unified frontier gateway with prompt caching support.";
          if (apiKeyLabel) apiKeyLabel.textContent = "OpenRouter API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-or-v1-...";
          if (modelInput) modelInput.placeholder = "anthropic/claude-3.7-sonnet";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value === "llama3.3:70b" || modelInput.value === "gpt-4o")) {
            modelInput.value = "anthropic/claude-3.7-sonnet";
          }
        } else if (prov === "anthropic") {
          baseUrlGroup.style.display = "none";
          if (apiKeyLabel) apiKeyLabel.textContent = "Anthropic API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-ant-...";
          if (modelInput) modelInput.placeholder = "claude-3-7-sonnet-20250219";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.includes("/") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "claude-3-7-sonnet-20250219";
          }
        } else if (prov === "gemini") {
          baseUrlGroup.style.display = "none";
          if (apiKeyLabel) apiKeyLabel.textContent = "Google AI Studio API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "AIzaSy...";
          if (modelInput) modelInput.placeholder = "gemini-2.5-pro";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gpt") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "gemini-2.5-pro";
          }
        } else if (prov === "openai") {
          baseUrlGroup.style.display = "block";
          if (baseUrlLabel) baseUrlLabel.textContent = "OpenAI Base URL (Optional)";
          if (baseUrlInput) baseUrlInput.placeholder = "https://api.openai.com/v1 (default)";
          if (baseUrlHint) baseUrlHint.textContent = "Leave blank for official OpenAI or enter custom proxy.";
          if (apiKeyLabel) apiKeyLabel.textContent = "OpenAI API Key";
          if (apiKeyInput) apiKeyInput.placeholder = "sk-...";
          if (modelInput) modelInput.placeholder = "gpt-4o";
          if (isUserChange && modelInput && (!modelInput.value || modelInput.value.startsWith("claude") || modelInput.value.startsWith("gemini") || modelInput.value.startsWith("llama"))) {
            modelInput.value = "gpt-4o";
          }
        }
      }

      // Update provider summary card
      if (summaryProvider) summaryProvider.textContent = (prov || "ANTHROPIC").toUpperCase();
      if (summaryModel && modelInput) summaryModel.textContent = modelInput.value;
      if (summaryCaching) {
        if (prov === "anthropic" || prov === "openrouter") {
          summaryCaching.innerHTML = "Active " + (ICONS["sparkles"] || "");
          summaryCaching.className = "badge badge-cached";
        } else {
          summaryCaching.textContent = "Standard";
          summaryCaching.className = "badge badge-pending";
        }
      }
    }

    function sendConfigSave(silent) {
      vscode.postMessage({
        type: "saveConfig",
        provider: providerSelect ? providerSelect.value : "anthropic",
        model: modelInput ? modelInput.value.trim() : "",
        apiKey: apiKeyInput ? apiKeyInput.value.trim() : "",
        baseUrl: baseUrlInput ? baseUrlInput.value.trim() : "",
        maxTokens: maxTokensSelect ? parseInt(maxTokensSelect.value, 10) : 32768,
        timeoutSeconds: timeoutSecondsSelect ? parseInt(timeoutSecondsSelect.value, 10) : 600,
        silent: !!silent
      });
      if (!silent && saveStatus) {
        saveStatus.style.display = "inline";
        setTimeout(() => { saveStatus.style.display = "none"; }, 3000);
      }
    }

    if (providerSelect) {
      providerSelect.addEventListener("change", function () {
        updateProviderUI(true);
        sendConfigSave(true);
      });
    }

    if (modelInput) {
      modelInput.addEventListener("input", function () {
        if (summaryModel) summaryModel.textContent = modelInput.value;
      });
      modelInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      modelInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (apiKeyInput) {
      apiKeyInput.addEventListener("input", function () {
        const hasKey = !!apiKeyInput.value.trim();
        if (summaryKeyStatus) {
          summaryKeyStatus.textContent = hasKey ? "Configured" : "Missing";
          summaryKeyStatus.className = "badge " + (hasKey ? "badge-completed" : "badge-failed");
        }
        if (providerIndicator && providerSelect) {
          providerIndicator.className = (providerSelect.value !== "ollama" && !hasKey) ? "tab-indicator alert" : "tab-indicator";
        }
      });
      apiKeyInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      apiKeyInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (baseUrlInput) {
      baseUrlInput.addEventListener("change", function () {
        sendConfigSave(true);
      });
      baseUrlInput.addEventListener("blur", function () {
        sendConfigSave(true);
      });
    }

    if (maxTokensSelect) {
      maxTokensSelect.addEventListener("change", function () {
        if (summaryMaxTokens) summaryMaxTokens.textContent = Number(maxTokensSelect.value).toLocaleString();
        sendConfigSave(true);
      });
    }

    if (timeoutSecondsSelect) {
      timeoutSecondsSelect.addEventListener("change", function () {
        if (summaryTimeout) summaryTimeout.textContent = timeoutSecondsSelect.value + "s";
        sendConfigSave(true);
      });
    }

    // Initial load: do NOT overwrite modelInput.value!
    updateProviderUI(false);

    // Button Actions
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener("click", function () {
        sendConfigSave(false);
      });
    }

    if (startPipelineBtn) startPipelineBtn.addEventListener("click", () => vscode.postMessage({ type: "startPipeline" }));
    if (stopBtn) stopBtn.addEventListener("click", () => vscode.postMessage({ type: "stopPipeline" }));
    if (refreshTasksBtn) {
      refreshTasksBtn.addEventListener("click", function () {
        refreshTasksBtn.style.transform = "rotate(360deg)";
        refreshTasksBtn.style.transition = "transform 0.4s ease";
        setTimeout(function () {
          refreshTasksBtn.style.transform = "none";
          refreshTasksBtn.style.transition = "none";
        }, 400);
        vscode.postMessage({ type: "forceReload" });
      });
    }
    if (clearLogBtn) clearLogBtn.addEventListener("click", () => { if (terminalLog) terminalLog.textContent = ""; });
    if (viewChatLogBtn) viewChatLogBtn.addEventListener("click", () => vscode.postMessage({ type: "openFile", relPath: "logs/llm_chat.md" }));

    if (copyPathBtn) copyPathBtn.addEventListener("click", () => vscode.postMessage({ type: "copyPath" }));
    if (revealOSBtn) revealOSBtn.addEventListener("click", () => vscode.postMessage({ type: "revealInOS" }));
    if (chooseDirBtn) chooseDirBtn.addEventListener("click", () => vscode.postMessage({ type: "selectDirectory" }));
    if (rescanDirBtn) rescanDirBtn.addEventListener("click", () => vscode.postMessage({ type: "rescanWorkspace" }));
    if (createFoldersBtn) createFoldersBtn.addEventListener("click", () => vscode.postMessage({ type: "createMissingFolders" }));
    const initPipelineQuickBtn = document.getElementById("initPipelineQuickBtn");
    if (initPipelineQuickBtn) initPipelineQuickBtn.addEventListener("click", () => vscode.postMessage({ type: "promptInitWorkspace" }));

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    let tickerInterval = null;
    function syncRunTicker(anyRunning) {
      if (anyRunning) {
        if (!tickerInterval) {
          tickerInterval = setInterval(function () {
            const runningCards = document.querySelectorAll(".task-card.running");
            if (!runningCards || runningCards.length === 0) {
              clearInterval(tickerInterval);
              tickerInterval = null;
              return;
            }
            runningCards.forEach(function (card) {
              const startStr = card.getAttribute("data-start-time");
              const durEl = card.querySelector(".task-duration");
              if (durEl && startStr) {
                const startMs = new Date(startStr).getTime();
                if (!isNaN(startMs)) {
                  const sec = Math.max(0, Math.round((Date.now() - startMs) / 1000));
                  durEl.textContent = sec + "s";
                }
              }
            });
          }, 1000);
        }
      } else {
        if (tickerInterval) {
          clearInterval(tickerInterval);
          tickerInterval = null;
        }
      }
    }

    // Render Webview State
    function renderState(state) {
      if (!state) return;

      try {
        const wsName = state.workspaceName || "Project";
        const wsPath = state.workingDirectory || "";

        // Update header & directory tab
        if (wsChipName) wsChipName.textContent = wsName;
        if (dirWsName) {
          if (wsPath) {
            dirWsName.innerHTML = (ICONS["folder-open"] || "") + " " + escapeHtml(wsName);
          } else {
            dirWsName.textContent = "No Workspace Open";
          }
        }
        if (dirWsPath) {
          dirWsPath.textContent = wsPath || "Please open a project directory via File > Open Folder... or click 'Choose Folder...' below";
          dirWsPath.title = wsPath;
        }

        if (dirIndicator) {
          dirIndicator.className = wsPath ? "tab-indicator" : "tab-indicator alert";
        }

        // Provider API Key alert
        if (providerIndicator) {
          const prov = state.provider || (providerSelect ? providerSelect.value : "anthropic");
          const hasKey = apiKeyInput ? !!apiKeyInput.value.trim() : false;
          providerIndicator.className = (prov !== "ollama" && !hasKey) ? "tab-indicator alert" : "tab-indicator";
        }

        // Tokens
        if (state.totalTokens) {
          const prompt = state.totalTokens.promptTokens || 0;
          const cached = state.totalTokens.cachedPromptTokens || 0;
          const response = state.totalTokens.completionTokens || 0;
          const total = state.totalTokens.totalTokens || (prompt + response);

          if (promptTokensEl) promptTokensEl.textContent = prompt.toLocaleString();
          if (cachedTokensEl) cachedTokensEl.textContent = cached.toLocaleString();
          if (responseTokensEl) responseTokensEl.textContent = response.toLocaleString();
          if (totalTokensEl) totalTokensEl.textContent = total.toLocaleString();
        }

        // Pipeline Running State
        const anyRunning = !!state.isRunning || (state.phases && state.phases.some(function(p) { return p && p.status === "running"; }));
        let runningIndex = (typeof state.currentPhaseIndex === "number" && state.currentPhaseIndex >= 0) ? state.currentPhaseIndex : -1;
        if (runningIndex === -1 && state.phases) {
          for (let i = 0; i < state.phases.length; i++) {
            const p = state.phases[i];
            if (p && p.status === "running") {
              runningIndex = i;
              break;
            }
          }
        }

        if (pipelineHeaderBadge) {
          if (anyRunning) {
            pipelineHeaderBadge.innerHTML = "RUNNING " + (ICONS["sparkles"] || "");
            pipelineHeaderBadge.className = "badge badge-running";
          } else {
            pipelineHeaderBadge.textContent = "IDLE";
            pipelineHeaderBadge.className = "badge badge-completed";
          }
        }

        if (pipelineIndicator) {
          pipelineIndicator.className = anyRunning ? "tab-indicator running" : "tab-indicator";
        }

        if (startPipelineBtn) startPipelineBtn.style.display = anyRunning ? "none" : "block";
        if (stopBtn) stopBtn.style.display = anyRunning ? "block" : "none";

        // Render Dynamic Analysis Tasks (Tab 1)
        if (phaseContainer) {
          let phaseHtml = "";
          const phaseCount = state.phases ? state.phases.length : 0;
          if (phaseCountLabel) phaseCountLabel.textContent = phaseCount + " Task" + (phaseCount === 1 ? "" : "s");

          if (!wsPath) {
            phaseHtml = '<div style="text-align:center; padding:15px; color:var(--muted);">No folder opened in VS Code.<br><br>Use <b>File &gt; Open Folder...</b> or the <b>Directory</b> tab to choose a folder.</div>';
          } else if (phaseCount === 0) {
            phaseHtml = '<div style="background:var(--vscode-sideBar-background); border:1px solid var(--vscode-widget-border, #333); border-radius:6px; padding:12px; margin:4px 0;">' +
              '<div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">' +
                '<span style="font-size:15px; display:inline-flex; align-items:center;">' + (ICONS["rocket-lunch"] || "") + '</span>' +
                '<div style="font-weight:600; font-size:12px; color:var(--vscode-foreground);">Initialize Analysis Pipeline</div>' +
              '</div>' +
              '<div style="font-size:11px; color:var(--muted); line-height:1.4; margin-bottom:10px;">' +
                'No analysis tasks found in this directory. Choose a pipeline to initialize your workspace with subdirectories, R setup scripts, and templates:' +
              '</div>' +
              '<div style="margin-bottom:8px;">' +
                '<label style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); display:block; margin-bottom:4px;">Pipeline Template</label>' +
                '<select id="pipelineTemplateSelect" style="width:100%; box-sizing:border-box; padding:5px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;">' +
                  '<option value="differential_expression">Differential Expression (5-Phase Pipeline)</option>' +
                  '<option value="quality_control_only">Quality Control &amp; Exploration (2-Phase QC)</option>' +
                '</select>' +
              '</div>' +
              '<div id="pipelineDescription" style="font-size:10px; color:var(--muted); margin-bottom:12px; background:rgba(255,255,255,0.03); padding:6px 8px; border-radius:4px; border-left:3px solid var(--primary, #007acc); line-height:1.4;">' +
                '<b>Phases:</b> 00_SETUP \u2794 01_DATA_QUALITY \u2794 02_EXPRESSION \u2794 03_OBSERVATIONS \u2794 04_SYNTHESIS.<br>' +
                '<i>Includes QC, normalization, imputation, differential expression, observation notes, and final synthesis report.</i>' +
              '</div>' +
              '<button type="button" id="initWorkspaceBtn" data-action="initWorkspace" class="btn-primary" style="width:100%; padding:7px 10px; font-size:11px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">' +
                '<span>' + (ICONS["sparkles"] || "") + '</span> Initialize Working Directory' +
              '</button>' +
            '</div>';
          } else {
            for (let i = 0; i < state.phases.length; i++) {
              const p = state.phases[i];
              if (!p) continue;
              const rawStatus = p.status || "pending";
              const checked = p.enabled !== false ? "checked" : "";

              let displayStatus = rawStatus.toUpperCase();
              let badgeClass = "badge badge-" + rawStatus;
              let cardClass = "task-card";
              let durationText = "----";

              if (rawStatus === "running") {
                displayStatus = "RUNNING";
                badgeClass = "badge badge-running";
                cardClass = "task-card running";
                if (p.startTime) {
                  const startMs = new Date(p.startTime).getTime();
                  const elapsedSec = !isNaN(startMs) ? Math.max(0, Math.round((Date.now() - startMs) / 1000)) : 0;
                  durationText = elapsedSec + "s";
                } else {
                  durationText = "0s";
                }
              } else if (rawStatus === "completed") {
                displayStatus = "COMPLETED";
                badgeClass = "badge badge-completed";
                durationText = (p.durationSeconds !== undefined && p.durationSeconds !== null && p.durationSeconds > 0)
                  ? p.durationSeconds + "sec"
                  : "ok";
              } else if (rawStatus === "failed") {
                displayStatus = "FAILED";
                badgeClass = "badge badge-failed";
                durationText = "err";
              } else if (state.isFullPipelineRunning && anyRunning && p.enabled !== false && runningIndex !== -1 && i > runningIndex) {
                displayStatus = "QUEUED";
                badgeClass = "badge badge-queued";
                durationText = "wait";
              } else if (p.durationSeconds !== undefined && p.durationSeconds !== null && p.durationSeconds > 0) {
                durationText = p.durationSeconds + "sec";
              }

              const rawFileName = p.fileName || "";
              let taskName = rawFileName;
              if (taskName.indexOf("/") !== -1) {
                taskName = taskName.substring(taskName.lastIndexOf("/") + 1);
              }
              if (taskName.indexOf(String.fromCharCode(92)) !== -1) {
                taskName = taskName.substring(taskName.lastIndexOf(String.fromCharCode(92)) + 1);
              }
              if (taskName.toLowerCase().endsWith(".md")) {
                taskName = taskName.slice(0, -3);
              }
              if (!taskName) {
                taskName = "TASK " + (i + 1);
              }
              if (p.isMasterSetup && taskName === "INSTRUCT") {
                taskName = "00_SETUP";
              }

              const safeTaskName = escapeHtml(taskName);
              const safeFileName = escapeHtml(rawFileName);
              const runDisabled = anyRunning ? "disabled" : "";
              const runBtnTitle = anyRunning ? "Pipeline is currently executing" : ("Run " + safeTaskName);
              const startTimeAttr = (rawStatus === "running" && p.startTime) ? (' data-start-time="' + escapeHtml(p.startTime) + '"') : '';

              phaseHtml += '<div class="' + cardClass + '"' + startTimeAttr + '>' +
                '<div class="task-left">' +
                  '<input type="checkbox" ' + checked + ' data-phase-id="' + escapeHtml(p.id) + '" title="Include in pipeline" ' + (anyRunning ? "disabled" : "") + ' />' +
                  '<span class="task-name" data-action="openPhase" data-file="' + safeFileName + '" title="Click to edit ' + safeFileName + ' in VS Code">' + safeTaskName + '</span>' +
                '</div>' +
                '<div class="task-right">' +
                  '<button type="button" class="btn-run" data-action="runPhase" data-id="' + escapeHtml(p.id) + '" ' + runDisabled + ' title="' + escapeHtml(runBtnTitle) + '">' + (ICONS["play"] || "") + ' RUN</button>' +
                  '<span class="' + badgeClass + '">' + escapeHtml(displayStatus) + '</span>' +
                  '<span class="task-duration">' + escapeHtml(durationText) + '</span>' +
                '</div>' +
              '</div>';
            }
          }
          phaseContainer.innerHTML = phaseHtml;
          syncRunTicker(anyRunning);
        }

        // Render Memory & Protocol Files (Tab 2)
        if (state.promptFiles) {
          let globalHtml = "";
          let bbHtml = "";
          let logsHtml = "";

          for (const pf of state.promptFiles) {
            if (!pf) continue;
            const badgeClass = pf.exists ? "badge badge-completed" : "badge badge-pending";
            const badgeText = pf.exists ? "OPEN" : "CREATE";
            const safeName = escapeHtml(pf.name || "");
            const safeRelPath = escapeHtml(pf.relPath || "");

            const card = '<div class="file-card" data-action="openFile" data-path="' + safeRelPath + '" title="Click to open ' + safeRelPath + ' in VS Code">' +
              '<div>' +
                '<div class="file-title">' + safeName + '</div>' +
                '<div class="file-path">' + safeRelPath + '</div>' +
              '</div>' +
              '<span class="' + badgeClass + '">' + badgeText + '</span>' +
            '</div>';

            if (pf.relPath && (pf.relPath.startsWith("agent/") || pf.relPath.startsWith("prompts/"))) {
              globalHtml += card;
            } else if (pf.relPath && pf.relPath.startsWith("docs/")) {
              bbHtml += card;
            } else if (pf.relPath && pf.relPath.startsWith("logs/")) {
              logsHtml += card;
            }
          }

          if (globalFrameContainer) globalFrameContainer.innerHTML = globalHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
          if (blackboardContainer) blackboardContainer.innerHTML = bbHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
          if (logsContainer) logsContainer.innerHTML = logsHtml || '<div style="color:var(--muted); font-size:10px;">None</div>';
        }

        // Render Folder Status (Tab 4)
        if (foldersListContainer && state.folders) {
          let fHtml = "";
          for (const f of state.folders) {
            const badgeClass = f.exists ? "badge badge-completed" : "badge badge-pending";
            const badgeText = f.exists ? (f.itemCount !== undefined ? f.itemCount + " FILES" : "FOUND") : "MISSING";
            fHtml += '<div class="folder-card">' +
              '<div>' +
                '<div class="folder-name">' + escapeHtml(f.relPath) + '/</div>' +
                '<div class="folder-desc">' + escapeHtml(f.description) + '</div>' +
              '</div>' +
              '<span class="' + badgeClass + '">' + badgeText + '</span>' +
            '</div>';
          }
          foldersListContainer.innerHTML = fHtml;
        }

      } catch (renderErr) {
        console.error("[TidyProteomicsAgent] Error rendering webview state:", renderErr);
      }
    }

    function appendLog(text) {
      if (terminalLog && text) {
        terminalLog.textContent += "\\n" + String(text);
        terminalLog.scrollTop = terminalLog.scrollHeight;
      }
    }

    // Message receiver
    window.addEventListener("message", function (event) {
      try {
        const message = event.data;
        if (!message) return;
        if (message.type === "stateUpdate") {
          renderState(message.state);
        } else if (message.type === "log") {
          appendLog(message.text);
        }
      } catch (err) {
        console.error("[TidyProteomicsAgent] Error in webview message handler:", err);
      }
    });

    // Request initial state proactively
    vscode.postMessage({ type: "requestState" });
    setTimeout(function () {
      vscode.postMessage({ type: "requestState" });
    }, 200);
  </script>
</body>
</html>`}};function ge(g){console.log("TidyProteomicsAgent extension is now active!");let e=x.window.createOutputChannel("TidyProteomicsAgent");g.subscriptions.push(e);let t=a=>{let l=a?.stack||String(a);typeof l=="string"&&(l.includes("Missing dataLength in event")||l.includes("strict mode functions"))||(e.appendLine(`[UNCAUGHT EXCEPTION] ${l}`),console.error("[TidyProteomicsAgent UNCAUGHT EXCEPTION]",a))},s=a=>{let l=a?.stack||String(a);typeof l=="string"&&(l.includes("Missing dataLength in event")||l.includes("strict mode functions"))||(e.appendLine(`[UNHANDLED REJECTION] ${l}`),console.error("[TidyProteomicsAgent UNHANDLED REJECTION]",a))};process.on("uncaughtException",t),process.on("unhandledRejection",s),g.subscriptions.push({dispose:()=>{process.removeListener("uncaughtException",t),process.removeListener("unhandledRejection",s)}});let o=new W(g.extensionUri,g);g.subscriptions.push(x.window.registerWebviewViewProvider(W.viewType,o));let n=[],i=a=>{for(let h of n)try{h.dispose()}catch{}n=[];let l=[];if(a)l.push(x.Uri.file(a));else{let h=x.workspace.workspaceFolders;h&&h.length>0&&l.push(...h)}if(l.length!==0)for(let h of l)try{let p=h.fsPath||h.uri?.fsPath||"";if(!p||!O.existsSync(p))continue;let r=K.join(p,"analysis");if(O.existsSync(r)){let y=x.workspace.createFileSystemWatcher(new x.RelativePattern(x.Uri.file(r),"*.md"));y.onDidCreate(()=>o.refreshPhases().catch(()=>{})),y.onDidChange(()=>o.refreshPhases().catch(()=>{})),y.onDidDelete(()=>o.forceReload().catch(()=>{})),n.push(y)}let c=K.join(p,"agent");if(O.existsSync(c)){let y=x.workspace.createFileSystemWatcher(new x.RelativePattern(x.Uri.file(c),"*.md"));y.onDidCreate(()=>o.refreshPhases().catch(()=>{})),y.onDidChange(()=>o.refreshPhases().catch(()=>{})),y.onDidDelete(()=>o.refreshPhases().catch(()=>{})),n.push(y)}let f=K.join(p,"prompts");if(O.existsSync(f)){let y=x.workspace.createFileSystemWatcher(new x.RelativePattern(x.Uri.file(f),"*.md"));y.onDidCreate(()=>o.refreshPhases().catch(()=>{})),y.onDidChange(()=>o.refreshPhases().catch(()=>{})),y.onDidDelete(()=>o.refreshPhases().catch(()=>{})),n.push(y)}let v=K.join(p,"docs");if(O.existsSync(v)){let y=x.workspace.createFileSystemWatcher(new x.RelativePattern(x.Uri.file(v),"notes.md"));y.onDidCreate(()=>o.forceReload().catch(()=>{})),y.onDidChange(()=>o.forceReload().catch(()=>{})),y.onDidDelete(()=>o.forceReload().catch(()=>{})),n.push(y)}}catch(p){let r=h.fsPath||h.uri?.fsPath||"";console.error("[TidyProteomicsAgent] Failed to initialize file watchers for folder:",r,p)}};o.onFolderChangedCallback=a=>{i(a)},i(),g.subscriptions.push(x.workspace.onDidChangeWorkspaceFolders(()=>{i(),o.onWorkspaceChanged().catch(()=>{})})),g.subscriptions.push({dispose:()=>{for(let a of n)try{a.dispose()}catch{}n=[]}}),g.subscriptions.push(x.commands.registerCommand("tidyproteomicsagent.startPipeline",()=>{o.startPipeline()})),g.subscriptions.push(x.commands.registerCommand("tidyproteomicsagent.runCurrentPhase",()=>{o.runSelectedPhase().catch(a=>{x.window.showErrorMessage(`TidyProteomicsAgent: ${a.message||String(a)}`)})})),g.subscriptions.push(x.commands.registerCommand("tidyproteomicsagent.refreshTasks",()=>{o.forceReload()})),g.subscriptions.push(x.commands.registerCommand("tidyproteomicsagent.resetState",async()=>{await x.window.showWarningMessage("Are you sure you want to reset the pipeline state in docs/notes.md?",{modal:!0},"Yes","Cancel")==="Yes"&&(await o.resetAllState(),x.window.showInformationMessage("TidyProteomicsAgent: Pipeline state reset."))})),g.subscriptions.push(x.commands.registerCommand("tidyproteomicsagent.initWorkspace",async()=>{await o.promptInitWorkspace()}))}function fe(){}0&&(module.exports={activate,deactivate});
