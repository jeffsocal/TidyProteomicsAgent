"use strict";var Pe=Object.create;var Z=Object.defineProperty;var Te=Object.getOwnPropertyDescriptor;var Ce=Object.getOwnPropertyNames;var Ie=Object.getPrototypeOf,Le=Object.prototype.hasOwnProperty;var Re=(y,e)=>{for(var t in e)Z(y,t,{get:e[t],enumerable:!0})},pe=(y,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of Ce(e))!Le.call(y,i)&&i!==t&&Z(y,i,{get:()=>e[i],enumerable:!(s=Te(e,i))||s.enumerable});return y};var N=(y,e,t)=>(t=y!=null?Pe(Ie(y)):{},pe(e||!y||!y.__esModule?Z(t,"default",{value:y,enumerable:!0}):t,y)),Ee=y=>pe(Z({},"__esModule",{value:!0}),y);var Oe={};Re(Oe,{activate:()=>Fe,deactivate:()=>Ue});module.exports=Ee(Oe);var I=N(require("vscode")),X=N(require("path")),V=N(require("fs"));var u=N(require("vscode")),b=N(require("path")),w=N(require("fs"));var E=N(require("fs/promises")),R=N(require("path"));var be=N(require("fs/promises")),D=N(require("path"));var k=N(require("fs")),v=N(require("path")),ge=require("child_process"),G="literature",le="literature_config.json",q=".duckdb",ue=v.join("tools","literature"),ce="@@LITERATURE_JSON@@",he="@@CORPUS_JSON@@";var _e=new Set([".pdf"]),Ae=new Set([".csv",".tsv",".xlsx",".xls"]),$e=3,me=500;function U(y){return v.join(y,G)}function fe(y){if(!y)return;let e=v.join(y,".vscode","corpora"),t=v.join(y,G);if(k.existsSync(e)&&!k.existsSync(t))try{k.mkdirSync(t,{recursive:!0});let s=k.readdirSync(e);for(let i of s){let o=v.join(e,i);if(i.toLowerCase().endsWith(q))k.copyFileSync(o,v.join(t,i));else if(i==="corpus_config.json")try{let n=k.readFileSync(o,"utf-8"),r=JSON.parse(n),a=r.activeLiterature||r.activeCorpus,p={activeLiterature:a,activeCorpus:a,useInSynthesis:!!r.useInSynthesis,updatedAt:r.updatedAt||new Date().toISOString()};k.writeFileSync(v.join(t,le),JSON.stringify(p,null,2)+`
`,"utf-8")}catch{}}}catch(s){console.warn("[LiteratureService] Auto-migration from .vscode/corpora failed:",s)}}function z(y){let e={useInSynthesis:!1};if(!y)return e;fe(y);try{let t=v.join(U(y),le),s="";if(k.existsSync(t))s=k.readFileSync(t,"utf-8");else{let n=v.join(y,".vscode","corpora","corpus_config.json");if(k.existsSync(n))s=k.readFileSync(n,"utf-8");else return e}let i=JSON.parse(s),o=typeof i.activeLiterature=="string"&&i.activeLiterature||typeof i.activeCorpus=="string"&&i.activeCorpus||void 0;return{activeLiterature:o,activeCorpus:o,useInSynthesis:!!i.useInSynthesis,updatedAt:typeof i.updatedAt=="string"?i.updatedAt:void 0}}catch{return e}}function ye(y){let e=z(y),t=e.activeLiterature||e.activeCorpus;if(!e.useInSynthesis||!t)return;let s=U(y),i=v.join(s,t);if(!k.existsSync(i)){let o=v.join(y,".vscode","corpora",t);if(k.existsSync(o))i=o;else return}return{relPath:v.join(G,t).replace(/\\/g,"/"),absPath:i}}function Ne(y){return String(y||"").trim().replace(/\.duckdb$/i,"").toLowerCase().replace(/[^a-z0-9_-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,64)}var ee=class{constructor(e,t,s=()=>{}){this.workspaceRoot=e;this.extensionPath=t;this.getRscriptOverride=s}queue=[];ingestFolder;writeChain=Promise.resolve();cachedRscript;cachedStats=new Map;setWorkspaceRoot(e){e!==this.workspaceRoot&&(this.workspaceRoot=e||"",this.queue=[],this.ingestFolder=void 0)}getWorkspaceRoot(){return this.workspaceRoot}requireRoot(){if(!this.workspaceRoot)throw new Error("No active workspace directory. Open or choose an analysis folder first.");return this.workspaceRoot}listDatabases(){if(!this.workspaceRoot)return[];fe(this.workspaceRoot);let e=U(this.workspaceRoot);if(!k.existsSync(e))return[];let t=[];for(let s of k.readdirSync(e)){if(!s.toLowerCase().endsWith(q))continue;let i=v.join(e,s);try{let o=k.statSync(i);if(!o.isFile())continue;t.push({name:s.slice(0,-q.length),fileName:s,relPath:v.join(G,s).replace(/\\/g,"/"),absPath:i,sizeBytes:o.size,modified:o.mtime.toISOString()})}catch{}}return t.sort((s,i)=>s.name.localeCompare(i.name))}listCorpora(){return this.listDatabases()}getConfig(){return z(this.workspaceRoot)}writeConfig(e){let t=U(this.requireRoot());k.mkdirSync(t,{recursive:!0});let s=e.activeLiterature||e.activeCorpus,i={...e,activeLiterature:s,activeCorpus:s,updatedAt:new Date().toISOString()};k.writeFileSync(v.join(t,le),JSON.stringify(i,null,2)+`
`,"utf-8")}getViewState(e){let t=this.listDatabases(),s=this.getConfig(),i=s.activeLiterature||s.activeCorpus;i&&!t.some(a=>a.fileName===i)&&(s={...s,activeLiterature:void 0,activeCorpus:void 0});let o=t.find(a=>a.fileName===i),n=this.workspaceRoot?U(this.workspaceRoot):"",r=i?this.cachedStats.get(v.basename(i)):void 0;return{workspaceRoot:this.workspaceRoot,literatureDir:n,corporaDir:n,databases:t,literature:t,corpora:t,config:s,activeLiterature:i,activeCorpus:i,useInSynthesis:!!s.useInSynthesis,activeLiteratureInfo:o,activeCorpusInfo:o,ingestFolder:this.ingestFolder,queue:[...this.queue],ingestionAvailable:!0,busy:e,isIngesting:e==="ingesting",stats:r}}async createDatabase(e){let t=this.requireRoot(),s=Ne(e);if(!s)throw new Error("Literature database name must contain at least one letter or number.");let i=`${s}${q}`,o=U(t);k.mkdirSync(o,{recursive:!0});let n=v.join(o,i);if(k.existsSync(n))throw new Error(`A literature database named '${i}' already exists.`);let r=await this.runCli("init",[n,e.trim()||s],!0);if(!r.ok)throw new Error(r.error||"Failed to initialize literature database.");this.cachedStats.set(i,{study_count:0,context_count:0,assertion_count:0,unique_symbols:0,organism_count:0,perturbation_count:0,studies:0,contexts:0,assertions:0,symbols:0,organisms:0,perturbations:0}),this.syncWorkspaceScripts();let a=this.getConfig();this.writeConfig({...a,activeLiterature:i,activeCorpus:i});let p=this.listDatabases().find(l=>l.fileName===i);if(!p)throw new Error("Literature database was initialized but could not be found on disk.");return p}async createCorpus(e){return this.createDatabase(e)}setActiveLiterature(e){let t=this.requireRoot();if(e){let o=v.join(U(t),v.basename(e));if(!k.existsSync(o))throw new Error(`Literature database '${e}' not found in ${G}.`)}let s=this.getConfig(),i=e?v.basename(e):void 0;this.writeConfig({...s,activeLiterature:i,activeCorpus:i}),this.syncWorkspaceScripts()}setActiveCorpus(e){this.setActiveLiterature(e)}setUseInSynthesis(e){let t=this.getConfig();this.writeConfig({...t,useInSynthesis:!!e}),e&&this.syncWorkspaceScripts()}async ensureSchema(e){let t=this.resolveLiteraturePath(e),s=await this.runCli("init",[t],!0);if(!s.ok)throw new Error(s.error||"Failed to migrate literature schema.")}async getStats(e){let t=this.getConfig(),s=e||t.activeLiterature||t.activeCorpus;if(!s)return{ok:!1,error:"No active literature database selected."};let i=await this.runCli("stats",[this.resolveLiteraturePath(s)],!1);if(i.ok&&i.data){let o=i.data.totals||i.data.stats||i.data,n={study_count:Number(o.study_count??o.studies??0),context_count:Number(o.context_count??o.contexts??0),assertion_count:Number(o.assertion_count??o.assertions??0),unique_symbols:Number(o.unique_symbols??o.symbols??0),organism_count:Number(o.organism_count??o.organisms??0),perturbation_count:Number(o.perturbation_count??o.perturbations??0),studies:Number(o.studies??o.study_count??0),contexts:Number(o.contexts??o.context_count??0),assertions:Number(o.assertions??o.assertion_count??0),symbols:Number(o.symbols??o.unique_symbols??0),organisms:Number(o.organisms??o.organism_count??0),perturbations:Number(o.perturbations??o.perturbation_count??0)};return this.cachedStats.set(v.basename(s),n),{...i,stats:n,data:{...i.data,stats:n,totals:{...i.data.totals||{},...n}}}}return i}async search(e,t=50,s){let i=this.getConfig(),o=s||i.activeLiterature||i.activeCorpus;if(!o)return{ok:!1,error:"No active literature database selected."};let n=String(e||"").trim();if(!n)return{ok:!1,error:"Enter a protein symbol, alias, functional module, or perturbation."};let r=await this.runCli("search",[this.resolveLiteraturePath(o),n,String(t)],!1);if(r.ok&&r.data){let a=r.data.rows||r.data.results||[];return{...r,results:a,rows:a,query:n,data:{...r.data,rows:a,results:a}}}return r}async generateReport(e,t="docs/literature_database.md"){let s=this.getConfig(),i=e||s.activeLiterature||s.activeCorpus;if(!i)return{ok:!1,error:"No active literature database selected."};let o=this.resolveLiteraturePath(i),n=v.isAbsolute(t)?t:v.join(this.requireRoot(),t);return await this.runCli("report",[o,n],!0)}resolveLiteraturePath(e){let t=v.basename(e),s=t.toLowerCase().endsWith(q)?t:`${t}${q}`,i=v.join(U(this.requireRoot()),s);if(k.existsSync(i))return i;if(this.workspaceRoot){let o=v.join(this.workspaceRoot,".vscode","corpora",s);if(k.existsSync(o))return o}return i}scanIngestFolder(e){if(!e||!k.existsSync(e)||!k.statSync(e).isDirectory())throw new Error(`Folder not found: ${e}`);let t=[],s=(i,o)=>{if(o>$e||t.length>=me)return;let n=[];try{n=k.readdirSync(i,{withFileTypes:!0})}catch{return}n.sort((r,a)=>r.name.localeCompare(a.name));for(let r of n){if(r.name.startsWith(".")||r.name.startsWith("~$"))continue;let a=v.join(i,r.name);if(r.isDirectory()){s(a,o+1);continue}let p=v.extname(r.name).toLowerCase(),l=_e.has(p)?"pdf":Ae.has(p)?"table":void 0;if(!l)continue;let d=0;try{d=k.statSync(a).size}catch{}if(t.push({id:`q${t.length+1}`,fileName:r.name,absPath:a,relPath:v.relative(e,a).replace(/\\/g,"/"),kind:l,sizeBytes:d,stage:"queued"}),t.length>=me)return}};return s(e,0),this.ingestFolder=e,this.queue=t,[...t]}clearQueue(){this.queue=[],this.ingestFolder=void 0}updateQueueItem(e,t){let s=this.queue.find(i=>i.id===e);s&&Object.assign(s,t)}syncWorkspaceScripts(){if(!this.workspaceRoot)return;let e=this.findTemplateScriptsDir();if(!e)return;let t=v.join(this.workspaceRoot,ue);try{k.mkdirSync(t,{recursive:!0});for(let s of k.readdirSync(e))s.endsWith(".R")&&k.copyFileSync(v.join(e,s),v.join(t,s))}catch(s){console.warn("[LiteratureService] Could not sync literature scripts into workspace:",s)}}findTemplateScriptsDir(){return[v.join(this.extensionPath,"templates","shared","tools","literature"),v.join(this.extensionPath,"extension","templates","shared","tools","literature"),v.join(__dirname,"..","templates","shared","tools","literature"),v.join(__dirname,"..","..","templates","shared","tools","literature"),v.join(this.extensionPath,"templates","shared","tools","corpus"),v.join(this.extensionPath,"extension","templates","shared","tools","corpus"),v.join(__dirname,"..","templates","shared","tools","corpus"),v.join(__dirname,"..","..","templates","shared","tools","corpus")].find(t=>k.existsSync(v.join(t,"literature_cli.R"))||k.existsSync(v.join(t,"corpus_cli.R")))}findCliScript(){let e=this.findTemplateScriptsDir();if(e){let t=v.join(e,"literature_cli.R");if(k.existsSync(t))return t;let s=v.join(e,"corpus_cli.R");if(k.existsSync(s))return s}if(this.workspaceRoot){let t=v.join(this.workspaceRoot,ue,"literature_cli.R");if(k.existsSync(t))return t;let s=v.join(this.workspaceRoot,"tools","corpus","corpus_cli.R");if(k.existsSync(s))return s}throw new Error("literature_cli.R not found in extension templates or workspace tools/literature/.")}resolveRscript(){let e=(this.getRscriptOverride()||"").trim();if(e)return e;if(this.cachedRscript)return this.cachedRscript;let t=["/usr/local/bin/Rscript","/opt/homebrew/bin/Rscript","/Library/Frameworks/R.framework/Resources/bin/Rscript","/usr/bin/Rscript"],s=(process.env.PATH||"").split(v.delimiter).filter(Boolean),i=process.platform==="win32"?"Rscript.exe":"Rscript";for(let n of s)t.unshift(v.join(n,i));let o=t.find(n=>{try{return k.statSync(n).isFile()}catch{return!1}});return this.cachedRscript=o||"Rscript",this.cachedRscript}runCli(e,t,s=!0,i=12e4){let o=()=>this.execR(this.findCliScript(),[e,...t],i),n=this.writeChain.then(o,o);return this.writeChain=n.catch(()=>{}),n}execR(e,t,s){return new Promise(i=>{let o;try{o=this.resolveRscript()}catch(n){i({ok:!1,error:n.message});return}(0,ge.execFile)(o,[e,...t],{cwd:this.workspaceRoot||void 0,timeout:s,maxBuffer:20*1024*1024},(n,r,a)=>{let l=String(r||"").split(/\r?\n/).find(g=>g.startsWith(ce)||g.startsWith(he));if(l)try{let g=l.startsWith(ce)?ce:he,m=JSON.parse(l.slice(g.length));m&&m.ok?i({ok:!0,data:m,stderr:String(a||"")}):i({ok:!1,error:m?.error||"Unknown R error",stderr:String(a||"")});return}catch(g){i({ok:!1,error:`Could not parse R output: ${g.message}`,stderr:String(a||"")});return}let d=n?.code,c;d==="ENOENT"?c=`Rscript not found ('${o}'). Install R or set 'tidyproteomicsagent.rscriptPath' in Settings.`:n?.killed?c=`R process timed out after ${Math.round(s/1e3)}s.`:c=String(a||n?.message||"").trim().split(/\r?\n/).slice(-6).join(`
`)||"R process exited without output.",i({ok:!1,error:c,stderr:String(a||"")})})})}};var te=class{constructor(e,t="agent",s="analysis"){this.workspaceRoot=e;this.promptsDir=t;this.analysisDir=s}setWorkspaceRoot(e){this.workspaceRoot=e||""}async readFileSafe(e){try{if(!this.workspaceRoot&&!D.isAbsolute(e))return"";let t=D.isAbsolute(e)?e:D.join(this.workspaceRoot,e);return await be.readFile(t,"utf-8")}catch{return""}}async buildPhaseContext(e){let t=this.promptsDir,s=await this.readFileSafe(D.join(t,"PROTOCOL.md"));if(!s&&t==="agent"){let T=await this.readFileSafe(D.join("prompts","PROTOCOL.md"));T&&(t="prompts",s=T)}if(!s){let T=await this.readFileSafe(".clinerules"),L=await this.readFileSafe(D.join(t,"INSTRUCT.md"));s=`${T}

${L}`.trim()}let i=await this.readFileSafe(D.join(t,"SKILL.md")),o=await this.readFileSafe(D.join("docs","experiment.md")),n=await this.readFileSafe(D.join(t,"VARIABLES.md"));n||(n=o||"No dataset parameters provided. See docs/experiment.md.");let r=await this.readFileSafe(D.join(t,"BIOLOGY.md")),a=r?`

# CURATED DOMAIN BIOLOGICAL CONTEXT
${r}`:"",p=`
# AUTONOMOUS ANALYSIS PROTOCOL & QUALITY GATES
${s}

# INPUT DATASET PARAMETERS & EXPERIMENT SPECIFICATION
${n}
${a}

# DOMAIN SKILL SPECIFICATION & API CONVENTIONS
${i}
`.trim(),l=await this.readFileSafe(D.join("docs","notes.md")),d=await this.readFileSafe(D.join("docs","llm.md")),c=`
## CURRENT RUNTIME STATE (Shared Memory)
### docs/notes.md:
${l||"No prior execution notes found. Initialize if this is Phase 0 or Phase 1."}

### docs/llm.md (ACTIVE MODEL & AGENT SPECIFICATION - READ ONLY):
${d||"No active model summary found."}

### docs/experiment.md (USER EXPERIMENT & DATASET SPECIFICATION):
${o||"No user experiment design provided. Note: Sections 1 & 2 are strictly user-maintained. The agent may append or update Section 3 to scaffold sample grouping, renaming, and contrast suggestions for user confirmation."}
${this.buildLiteratureSection()}
`.trim(),g=e;!e.includes("/")&&!e.includes("\\")&&(g=D.join(this.analysisDir,e));let m=await this.readFileSafe(g),f=p,S=D.basename(e).replace(/\.md$/,"").toUpperCase(),P=`
${c}

---

## ACTIVE PHASE DIRECTIVE (${e})
${m}

### Execution Instructions:
- Adhere strictly to the guidelines and gate checkpoints for this phase.
- Execute code and commands to make real progress.
- For scripts and documents under 150 lines, always write or overwrite the full file using 'write_file'.
- When authoring or updating any report or document (e.g. in docs/), reference 'docs/llm.md' and place the metadata header immediately beneath the title:
  Title

  Created: YYYY-MM-DD HH:MM
  Author: PROVIDER | LLM-MODEL
  Agent: TidyProteomicsAgent vX.X.X
- In docs/experiment.md: Never overwrite or modify Sections 1 & 2 (user hypotheses and dataset parameters). You are authorized and instructed to append or update Section 3 (Sample Grouping, Recoding & Contrast Designations) to scaffold discovered sample groups, renaming/pooling tables, and suggested contrast pairs for user review.
- Once all checkpoints for this phase are satisfied and verified, invoke complete_phase(phaseName = "${S}", summary = "...").
- If a mandatory pre-flight gate, configuration prerequisite, or checkpoint fails and requires user intervention (such as unconfigured placeholders or ambiguous/confounded contrasts in docs/experiment.md), scaffold concrete suggestions directly into Section 3 of docs/experiment.md, then immediately invoke fail_phase(phaseName = "${S}", reason = "...", actionableInsights = "...") to halt execution and present actionable insights to the user.
`.trim();return{systemPrompt:f,phasePrompt:P,blackboardState:c,staticPrefixForCache:p}}buildLiteratureSection(){if(!this.workspaceRoot)return"";let e=z(this.workspaceRoot);if(!(e.activeLiterature||e.activeCorpus)&&!e.useInSynthesis)return"";let s=ye(this.workspaceRoot);return s?`
### ACTIVE LITERATURE DATABASE (DuckDB - READ ONLY):
- Status: ENABLED for literature corroboration and synthesis.
- Database file: \`${s.relPath}\`
- Schema: studies(study_id, title, year, core_thesis) -> experimental_contexts(context_id, organism, model_name, perturbation_type, perturbation_target, assay_modality) -> molecular_assertions(raw_entity_name, canonical_human_symbol, relationship_type, functional_module, quantitative_note, evidence_quote). Denormalized view: v_assertions_full.
- Inspect: \`Rscript tools/literature/literature_cli.R stats ${s.relPath}\`
- Lookup: \`Rscript tools/literature/literature_cli.R search ${s.relPath} <SYMBOL_OR_MODULE> [limit]\`
- Query Skill: \`Rscript tools/literature/query_literature.R ${s.relPath} "<seed_symbols>" "<pathway_terms>"\`
- Policy: Prefer literature database evidence (cite study_id + verbatim evidence_quote) over generic web search. Open the database read-only; never modify it during analysis phases.
`:`
### ACTIVE LITERATURE DATABASE (DuckDB):
- Status: DISABLED for synthesis (toggle off or no database selected in the Literature tab).
- Use the standard literature corroboration strategy described in the phase directive.
`}};var se=class{constructor(e,t,s,i,o,n,r,a){this.phaseName=e;this.phaseTitle=t;this.client=s;this.tools=i;this.context=o;this.onProgress=n;this.chatLogger=r;this.isCancelled=a}messages=[];totalUsage={promptTokens:0,completionTokens:0,totalTokens:0,cachedPromptTokens:0};getTotalUsage(){return{...this.totalUsage}}async run(e=25){let t=Date.now();if(this.messages.push({role:"user",content:this.context.phasePrompt}),this.chatLogger){this.chatLogger.setPhase(this.phaseName);let a=this.client.getConfig();await this.chatLogger.logPhaseStart({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,model:a.model,provider:a.provider,systemPromptFiles:["agent/PROTOCOL.md","docs/experiment.md","agent/SKILL.md"],inputPromptFiles:[this.phaseName.includes("/")?this.phaseName:`analysis/${this.phaseName}`,"docs/notes.md","docs/llm.md","docs/experiment.md"]})}let s=0,i="",o=0;for(;s<e;){if(this.isCancelled&&this.isCancelled()){let c="Execution stopped by user.";if(this.chatLogger){let g=Math.round((Date.now()-t)/1e3);await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:c,durationSeconds:g,tokensUsed:this.totalUsage,turnCount:s})}return{success:!1,summary:c,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}s++,this.onProgress({type:"thought",data:`Starting Turn ${s}/${e}...`});let a,p=2,l=0,d=null;for(;l<=p&&(l++,!(this.isCancelled&&this.isCancelled()));)try{a=await this.client.chat({system:this.context.systemPrompt,messages:this.messages,tools:this.tools.getDefinitions(),onToken:c=>{this.onProgress({type:"text",data:c})}}),d=null;break}catch(c){if(d=c,(c.name==="TimeoutError"||c.name==="AbortError"||/timeout|aborted|ETIMEDOUT|ECONNRESET/i.test(c.message||""))&&l<=p&&(!this.isCancelled||!this.isCancelled())){let m=l*3e3;this.onProgress({type:"thought",data:`Turn ${s} timed out on attempt ${l}/${p+1} (${c.message}). Retrying in ${m/1e3}s...`}),await new Promise(f=>setTimeout(f,m));continue}break}if(!a){let c=d?`LLM API Error during turn ${s}: ${d.message}`:"Execution stopped by user.";if(this.chatLogger){let g=Math.round((Date.now()-t)/1e3);await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:c,durationSeconds:g,tokensUsed:this.totalUsage,turnCount:s})}return{success:!1,summary:c,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}if(this.totalUsage.promptTokens+=a.usage.promptTokens,this.totalUsage.completionTokens+=a.usage.completionTokens,this.totalUsage.totalTokens+=a.usage.totalTokens,this.totalUsage.cachedPromptTokens=(this.totalUsage.cachedPromptTokens||0)+(a.usage.cachedPromptTokens||0),this.onProgress({type:"tokens",data:{turn:s,turnUsage:a.usage,totalUsage:{...this.totalUsage}}}),this.messages.push({role:"assistant",content:a.content,tool_calls:a.tool_calls}),this.chatLogger&&await this.chatLogger.logAssistantResponse(s,a.content,a.tool_calls,a.usage),a.truncationDetected){let c=`Output limit reached (finish_reason: "${a.finishReason||"length"}", tokens: ${a.usage.completionTokens}). Generation was truncated.`;this.onProgress({type:"thought",data:c}),this.chatLogger&&await this.chatLogger.logTruncationWarning(s,a.finishReason||"length",a.usage.completionTokens)}if(a.tool_calls&&a.tool_calls.length>0){o=0;for(let c of a.tool_calls){this.onProgress({type:"tool_start",data:{name:c.name,args:c.args}});let g=await this.tools.execute(c.name,c.args);this.onProgress({type:"tool_end",data:{name:c.name,result:g.content,isError:g.isError}});let m=g.content;if(m&&m.length>24e3){let S=m.slice(0,12e3),P=m.slice(-1e4),T=m.length-22e3;m=`${S}

... [Output truncated: ${T.toLocaleString()} characters omitted to preserve context economy. See complete output in workspace/logs/ or inspect with 'read_file'] ...

${P}`}if(this.messages.push({role:"tool",tool_call_id:c.id,tool_name:c.name,content:m}),this.chatLogger&&await this.chatLogger.logToolResult(c.name,c.id,g.content,g.isError,c.args),c.name==="fail_phase"){let S=c.args.reason||"Phase gate or checkpoint failed",P=c.args.actionableInsights||"",T=P?`[Failed] Pre-flight Gate / Checkpoint: ${S}

Actionable Insights:
${P}`:`[Failed] Pre-flight Gate / Checkpoint: ${S}`,L=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:T,durationSeconds:L,tokensUsed:this.totalUsage,turnCount:s}),{success:!1,summary:T,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}if(c.name==="complete_phase"){i=c.args.summary||a.content;let S=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!0,summary:i,durationSeconds:S,tokensUsed:this.totalUsage,turnCount:s}),{success:!0,summary:i,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}}}else if(o++,a.content.includes("PHASE_COMPLETED")||a.content.includes("CHECKPOINT_PASSED")){let c=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!0,summary:a.content,durationSeconds:c,tokensUsed:this.totalUsage,turnCount:s}),{success:!0,summary:a.content,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}else if(this.isPhaseFailureOrHalt(a.content)){let c=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:a.content,durationSeconds:c,tokensUsed:this.totalUsage,turnCount:s}),{success:!1,summary:a.content,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}else if(o>=2){let c=`Execution halted: Agent stopped calling tools and provided instructions to user:

${a.content}`,g=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:c,durationSeconds:g,tokensUsed:this.totalUsage,turnCount:s}),{success:!1,summary:c,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:s}}else a.truncationDetected?this.messages.push({role:"user",content:`[System Notice]: Your response reached the maximum output token limit (finish_reason: "${a.finishReason||"length"}", completion tokens: ${a.usage.completionTokens}). Any attempted tool call was truncated before completion and could not be parsed. Please write the output in smaller sections or verify that Max Output Tokens in settings is set sufficiently high.`}):this.messages.push({role:"user",content:"Please execute the required tools to fulfill the objectives of this phase, or call complete_phase when finished, or call fail_phase if a prerequisite/gate failed."})}let n=`Turn limit reached (${e} turns) without completing phase checkpoints.`,r=Math.round((Date.now()-t)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:n,durationSeconds:r,tokensUsed:this.totalUsage,turnCount:e}),{success:!1,summary:n,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:e}}isPhaseFailureOrHalt(e){if(!e)return!1;let t=e.toLowerCase();return!!([/pre-flight\s+gate\s+fail/i,/specification\s+gate\s+fail/i,/checkpoint\s+gate\s+fail/i,/\bgate\s+failed\b/i,/\bphase\s+(?:[0-9a-zA-Z_]+\s+)?(?:is\s+blocked|remains\s+blocked|cannot\s+be\s+completed|is\s+halted)\b/i,/\bphase_failed\b/i,/\bphase_blocked\b/i,/\bphase_halted\b/i,/\bblocked_specification_gate\b/i,/\bhalt(?:ed)?\s+(?:immediately\s+)?with\s+status\s+`?failed`?/i,/\bhalt\s+directive\b/i].some(i=>i.test(e))||e.includes("\u274C")&&(t.includes("placeholder")||t.includes("blocked")||t.includes("rerun phase")||t.includes("gate")))}};var H=N(require("fs/promises")),W=N(require("path")),ie=class{constructor(e,t=""){this.workspaceRoot=e;this.workspaceRoot=e||"",t?this.setPhase(t):this.pipelineLogPath=this.resolveLogPath("logs/pipeline.md")}currentPhaseTag="";logPath="";consoleLogPath="";pipelineLogPath="";writeQueue=Promise.resolve();setWorkspaceRoot(e){this.workspaceRoot=e||"",this.currentPhaseTag?this.setPhase(this.currentPhaseTag):this.pipelineLogPath=this.resolveLogPath("logs/pipeline.md")}setPhase(e){if(!e)return;let t=W.basename(e).replace(/\.md$/i,"").toLowerCase();t.startsWith("instruct")&&(t="00_install"),this.currentPhaseTag=t,this.logPath=this.resolveLogPath(`logs/${t}/chat.md`),this.consoleLogPath=this.resolveLogPath(`logs/${t}/console.log`),this.pipelineLogPath=this.resolveLogPath("logs/pipeline.md")}getPhaseTag(){return this.currentPhaseTag}getLogPath(){return this.logPath||this.pipelineLogPath}getConsoleLogPath(){return this.consoleLogPath}getPipelineLogPath(){return this.pipelineLogPath}resolveLogPath(e){return W.isAbsolute(e)?e:this.workspaceRoot?W.join(this.workspaceRoot,e):""}async appendToFile(e,t){if(!(!this.workspaceRoot||!e))return this.writeQueue=this.writeQueue.then(async()=>{try{let s=W.dirname(e);await H.mkdir(s,{recursive:!0}),await H.appendFile(e,t+`
`,"utf-8")}catch(s){console.error(`[ChatLogger] Failed to write to ${e}:`,s)}}),this.writeQueue}async append(e){let t=this.logPath||this.pipelineLogPath;return this.appendToFile(t,e)}async ensurePipelineSummaryHeader(){if(!(!this.workspaceRoot||!this.pipelineLogPath))try{await H.stat(this.pipelineLogPath)}catch{let e=["# TidyProteomics Pipeline Execution Summary","","> Master index of autonomous reasoning traces and raw execution logs per phase.","","| Phase | Title | Status | Duration | Total Tokens | Logs |","| :--- | :--- | :--- | :--- | :--- | :--- |"].join(`
`);await this.appendToFile(this.pipelineLogPath,e)}}async logPhaseStart(e){this.setPhase(e.phaseFileName),await this.ensurePipelineSummaryHeader(),this.consoleLogPath&&await this.writeQueue.then(async()=>{try{await H.mkdir(W.dirname(this.consoleLogPath),{recursive:!0}),await H.appendFile(this.consoleLogPath,`=== Phase Started: ${e.phaseTitle} [${new Date().toISOString()}] ===
`,"utf-8")}catch{}});let t=new Date().toISOString(),s=e.systemPromptFiles||["agent/PROTOCOL.md","docs/experiment.md","agent/SKILL.md"],i=e.inputPromptFiles||[e.phaseFileName.includes("/")?e.phaseFileName:`analysis/${e.phaseFileName}`,"docs/notes.md","docs/llm.md","docs/experiment.md"],o=["","---","",`# [${t}] Phase Start: ${e.phaseTitle}`,`- **Phase Directive**: \`${e.phaseFileName}\``,`- **Model**: \`${e.model}\` | **Provider**: \`${e.provider}\``,`- **Console Output**: [\`logs/${this.currentPhaseTag}/console.log\`](./console.log)`,"","### Persistent System Frame (Sent & Cached Prefix)",...s.map(n=>`- \`${n}\``),"","### Input Prompts & Blackboard Directives (Turn 1)",...i.map(n=>`- \`${n}\``),""];await this.append(o.join(`
`))}async logAssistantResponse(e,t,s,i){let n=[`### [${new Date().toISOString()}] Assistant (Turn ${e})`];if(t&&t.trim().length>0&&(n.push(""),n.push(t.trim())),s&&s.length>0){n.push(""),n.push("**Tool Calls**:");for(let r of s)n.push(`- **\`${r.name}\`** (id: \`${r.id}\`)`),n.push("  ```json"),n.push(JSON.stringify(r.args,null,2).split(`
`).map(a=>`  ${a}`).join(`
`)),n.push("  ```")}if(i){let r=i.cachedPromptTokens||0;n.push(""),n.push(`> **Metrics**: Turn Tokens: **${i.totalTokens.toLocaleString()}** (Prompt: ${i.promptTokens.toLocaleString()}, Completion: ${i.completionTokens.toLocaleString()}, Cached: ${r.toLocaleString()})`)}n.push(""),await this.append(n.join(`
`))}async logTruncationWarning(e,t,s){let i=new Date().toISOString(),o=[`> **WARNING (Turn ${e})**: Generation hit output token limit (\`finish_reason: "${t}"\`, completion tokens: **${s.toLocaleString()}**). Response or pending tool calls were truncated mid-stream!`,""];await this.append(o.join(`
`))}async logToolResult(e,t,s,i,o){let n=new Date().toISOString(),r=i?"FAILED":"SUCCESS",a=s?s.trim():"(No output)";if(e==="execute_command"){let l=o?.command||"(command string unavailable)";if(this.consoleLogPath){let g=["================================================================================",`[${n}] Command: ${l}`,`Status: ${r} (id: ${t})`,"================================================================================",a,""].join(`
`);await this.appendToFile(this.consoleLogPath,g)}let c=[`#### [${n}] Tool Result: \`${e}\` [${r}] (id: \`${t}\`)`,`- **Command**: \`${l}\``,`- **Status**: ${i?"\u274C Command failed":"\u2713 Command executed successfully"}`,`- **Console Output**: Logged to [\`logs/${this.currentPhaseTag}/console.log\`](./console.log)`];if(i){let g=a.split(`
`),m=g.filter(S=>/error|failed|exception|cannot|fatal/i.test(S)),f=m.length>0?m.slice(-10):g.slice(-10);c.push("- **Error Excerpt**:"),c.push("  ```text");for(let S of f)c.push(`  ${S.trim()}`);c.push("  ```")}else{let g=a.split(`
`).filter(m=>/CHECKPOINT.*PASS|ALL_CHECKPOINTS_PASSED|PHASE_.*_PASS/i.test(m)).slice(0,3);if(g.length>0)for(let m of g)c.push(`- **Checkpoint Highlight**: \`${m.trim()}\``);else{let m=a.split(`
`).length;c.push(`- **Console Volume**: ${m.toLocaleString()} lines captured in console.log`)}}c.push(""),await this.append(c.join(`
`));return}if(e==="write_file"){let l=o?.filePath||"",d=[`#### [${n}] Tool Result: \`${e}\` [${r}] (id: \`${t}\`)`,`- **Target File**: \`${l}\``,`- **Result**: ${a}`,""];await this.append(d.join(`
`));return}if(e==="read_file"){let l=o?.filePath||"",d=a.split(`
`),c=[`#### [${n}] Tool Result: \`${e}\` [${r}] (id: \`${t}\`)`,`- **Inspected File**: \`${l}\``];if(d.length>25){let g=d.slice(0,15).join(`
`);c.push("```"),c.push(g),c.push(`
... [${(d.length-15).toLocaleString()} lines omitted in chat log for economy] ...`),c.push("```")}else c.push("```"),c.push(a),c.push("```");c.push(""),await this.append(c.join(`
`));return}let p=[`#### [${n}] Tool Result: \`${e}\` [${r}] (id: \`${t}\`)`,"```",a,"```",""];await this.append(p.join(`
`))}async logPhaseEnd(e){let t=new Date().toISOString(),s=e.success?"\u2713":"\u274C",i=e.success?"COMPLETED":"FAILED",o=e.tokensUsed.cachedPromptTokens||0,n=[`### [${t}] ${s} Phase ${i}: ${e.phaseTitle}`,`- **Duration**: ${e.durationSeconds}s | **Total Turns**: ${e.turnCount}`,`- **Cumulative Tokens**: Total: **${e.tokensUsed.totalTokens.toLocaleString()}** | Prompt: ${e.tokensUsed.promptTokens.toLocaleString()} | Completion: ${e.tokensUsed.completionTokens.toLocaleString()} | Cached: ${o.toLocaleString()}`,"- **Logs**: [`chat.md`](./chat.md) | [`console.log`](./console.log)","","**Summary**:",e.summary,"","---",""].join(`
`);if(await this.append(n),this.pipelineLogPath){let r=`| ${s} **${this.currentPhaseTag}** | ${e.phaseTitle} | ${i} | ${e.durationSeconds}s | ${e.tokensUsed.totalTokens.toLocaleString()} | [Chat](./${this.currentPhaseTag}/chat.md) \\| [Console](./${this.currentPhaseTag}/console.log) |`;await this.appendToFile(this.pipelineLogPath,r)}}};var K=N(require("fs/promises")),de=N(require("path"));function Me(y=new Date){let e=r=>r.toString().padStart(2,"0"),t=y.getFullYear(),s=e(y.getMonth()+1),i=e(y.getDate()),o=e(y.getHours()),n=e(y.getMinutes());return`${t}-${s}-${i} ${o}:${n}`}function De(y,e="0.1.0",t=new Date){let s=Me(t),i=(y.provider||"anthropic").toUpperCase(),o=y.model||"claude-3-7-sonnet-20250219",n=y.provider==="anthropic"||y.provider==="openrouter"?"Active \u26A1":"Standard",r=(y.maxTokens||32768).toLocaleString(),a=`${y.timeoutSeconds||600}s`,p=y.apiKey?"Configured":y.provider==="ollama"?"Not Required (Local)":"Missing",l=y.baseUrl&&y.baseUrl.trim()?y.baseUrl.trim():"Default",d=`TidyProteomicsAgent v${e||"0.1.0"}`,c=`${i} | ${o}`;return`# Active Model Summary

Created: ${s}
Author: ${c}
Agent: ${d}

## Active Configuration

| Configuration Property | Value |
| :--- | :--- |
| **Provider** | ${i} |
| **Model** | ${o} |
| **Author** | ${c} |
| **Agent** | ${d} |
| **Prompt Caching** | ${n} |
| **Max Output Tokens** | ${r} |
| **Request Timeout** | ${a} |
| **Key Status** | ${p} |
| **Base URL** | ${l} |

---

## Agent Document Header Standard
All agent-authored documents and reports (including \`docs/observations.md\`, \`docs/knowledge.md\`, \`docs/websearch.md\`, \`docs/literature.md\`, \`docs/scientific_report.md\`, and any other generated markdown reports) must reference this specification and place the following metadata block immediately below the title:

\`\`\`markdown
Title

Created: YYYY-MM-DD HH:MM
Author: ${c}
Agent: ${d}
\`\`\`
`}async function Q(y,e,t="0.1.0"){if(!y)return"";let s=de.join(y,"docs");await K.mkdir(s,{recursive:!0});let i=de.join(s,"llm.md"),o=De(e,t);try{let n=await K.readFile(i,"utf-8"),r=a=>a.replace(/Created:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/g,"");if(r(n)===r(o))return i}catch{}return await K.writeFile(i,o,"utf-8"),i}var oe=class{constructor(e,t,s,i,o,n="0.1.0"){this.workspaceRoot=e;this.client=t;this.tools=s;this.onStateChange=i;this.onLog=o;this.extensionVersion=n;this.workspaceRoot=e||"",this.chatLogger=new ie(this.workspaceRoot),this.workspaceRoot&&this.rescanPhases().catch(r=>{console.error("[PipelineOrchestrator] Error rescanning phases:",r)})}phases=[];isRunning=!1;isFullPipelineRunning=!1;shouldStop=!1;chatLogger;setExtensionVersion(e){this.extensionVersion=e||"0.1.0"}async syncModelSummary(){return this.workspaceRoot?await Q(this.workspaceRoot,this.client.getConfig(),this.extensionVersion):""}ts(){return new Date().toTimeString().split(" ")[0]}logPhase(e,t,s=!1){let i=`[${this.ts()}] ${e}: ${t}`;this.onLog(this.truncateTo(i,120),s)}logPipeline(e,t=!1){this.logPhase("Pipeline",e,t)}truncateTo(e,t=120){return e.length<=t?e:e.slice(0,t-3)+"..."}formatToolHeader(e,t){switch(e){case"execute_command":return`[Command] ${String(t?.command||"").trim().replace(/\s+/g," ")}`;case"read_file":{let s=String(t?.filePath||"").trim(),i=t?.startLine?` (lines ${t.startLine}-${Number(t.startLine)+Number(t.maxLines||0)-1})`:"";return`[Read] ${s}${i}`}case"write_file":{let s=String(t?.filePath||"").trim(),i=typeof t?.content=="string"?` (${t.content.length} chars)`:"";return`[Write] ${s}${i}`}case"replace_file_content":return`[Edit] ${String(t?.filePath||"").trim()}`;case"list_directory":{let s=String(t?.dirPath||".").trim();return`[List] ${!s||s==="."||s==="./"?"directory contents":s}`}case"check_checkpoint_gate":return`[Check Gate] ${Array.isArray(t?.requiredFiles)?t.requiredFiles.join(", "):""}`;case"complete_phase":return`[Complete Phase] ${String(t?.phaseName||"").trim()}`;case"fail_phase":{let s=String(t?.phaseName||"").trim(),i=String(t?.reason||"").trim();return`[Halt Phase] ${s}${i?": "+i:""}`}default:{let s=Object.keys(t||{}),i=s.length>0?` (${s.join(", ")})`:"";return`[${e}]${i}`}}}getIsRunning(){return this.isRunning}getIsFullPipelineRunning(){return this.isFullPipelineRunning}async setWorkingDirectory(e){if(this.isRunning){this.logPipeline("Cannot change working directory while a pipeline or phase is actively running.");return}this.workspaceRoot=e||"",this.tools.setWorkspaceRoot(this.workspaceRoot),this.chatLogger.setWorkspaceRoot(this.workspaceRoot);try{await this.rescanPhases()}catch(t){console.error("[PipelineOrchestrator] Error rescanning phases on directory change:",t)}}getWorkingDirectory(){return this.workspaceRoot}async loadNotesRecords(){let e=new Map;if(!this.workspaceRoot)return e;try{let t=R.join(this.workspaceRoot,"docs","notes.md"),i=(await E.readFile(t,"utf-8")).split(/\n(?=###\s+)/);for(let o of i){let n=o.match(/- \*\*File\*\*:\s*`([^`]+)`/);if(!n)continue;let r=n[1].trim(),a=o.match(/- \*\*Duration\*\*:\s*(\d+)s/),p=a?parseInt(a[1],10):void 0,l=o.match(/- \*\*Start\*\*:\s*([^\n\r]+)/),d=l?l[1].trim():void 0,c=o.match(/- \*\*End\*\*:\s*([^\n\r]+)/),g=c?c[1].trim():void 0,m=o.match(/- \*\*Token Usage\*\*:\s*Total:\s*(\d+|N\/A),\s*Prompt:\s*(\d+|N\/A),\s*Completion:\s*(\d+|N\/A)(?:,\s*Cached:\s*(\d+|N\/A))?/i),f;if(m){let C=m[1]!=="N/A"?parseInt(m[1],10):0,x=m[2]!=="N/A"?parseInt(m[2],10):0,$=m[3]!=="N/A"?parseInt(m[3],10):0,O=m[4]&&m[4]!=="N/A"?parseInt(m[4],10):0;f={totalTokens:C,promptTokens:x,completionTokens:$,cachedPromptTokens:O}}let S=o.includes("- COMPLETED"),P=o.includes("- FAILED"),T=S?"completed":P?"failed":"completed",L=o.match(/\*\*Summary\*\*:\s*\n([\s\S]*?)(?:\n---|\n###|$)/),B=L?L[1].trim():void 0,h={status:T,durationSeconds:p,tokenUsage:f,summary:B,startTime:d,endTime:g};e.set(r,h);let _=R.basename(r);e.has(_)||e.set(_,h)}}catch{}return e}async forceReloadFromDisk(){if(this.isRunning){this.logPipeline("Cannot force reload while an active pipeline run is in flight.");return}await this.rescanPhases(!0),this.logPipeline("Reloaded all tasks and progress from disk.")}async resetAllState(){if(this.isRunning){this.logPipeline("Cannot reset state while an active run is in flight.");return}let e=R.join(this.workspaceRoot,"docs","notes.md");try{let t=`# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`;await E.writeFile(e,t,"utf-8")}catch{}for(let t of this.phases)t.status="pending",t.startTime=void 0,t.endTime=void 0,t.durationSeconds=void 0,t.tokenUsage=void 0,t.summary=void 0,t.error=void 0;await this.rescanPhases(!0),this.logPipeline("State and runtime blackboard reset to initial state.")}async rescanPhases(e=!1){if(this.isRunning)return;if(!this.workspaceRoot){this.phases=[],await this.notifyState();return}let t=await this.loadNotesRecords(),s=e?new Map:new Map(this.phases.map(a=>[a.fileName,a])),i=new Map(this.phases.map(a=>[a.fileName,a.enabled])),o=[],n=R.join(this.workspaceRoot,"analysis"),r=!1;try{let p=(await E.readdir(n)).filter(l=>l.endsWith(".md")).sort();for(let l=0;l<p.length;l++){let d=p[l];d.startsWith("00_")&&(r=!0);let c=s.get(d),g=t.get(d)||t.get(R.basename(d)),m=c?.title;if(!m){try{let B=(await E.readFile(R.join(n,d),"utf-8")).split(`
`).find(h=>h.trim().startsWith("#"));B&&(m=B.replace(/^#+\s*/,"").trim())}catch{}m||(m=d.replace(/^[0-9]+_/,"").replace(/\.md$/,"").replace(/_/g," "),m=`Phase: ${m}`)}let f=d.match(/^([0-9]+)/)?.[1]||String(l+1).padStart(2,"0"),S=d.startsWith("00_"),P="pending";c?.status&&c.status!=="running"?P=c.status:g?.status&&(P=g.status);let T=i.has(d)?i.get(d):c?c.enabled:!0;o.push({id:f,fileName:d,title:m,status:P,enabled:T,isMasterSetup:S,startTime:c?.startTime||g?.startTime,endTime:c?.endTime||g?.endTime,durationSeconds:c?.durationSeconds||g?.durationSeconds,tokenUsage:c?.tokenUsage||g?.tokenUsage,summary:c?.summary||g?.summary,error:c?.error||(P==="failed"?g?.summary:void 0)})}}catch{this.logPipeline(`Note: 'analysis' directory not found in ${this.workspaceRoot}`)}if(!r){let a="agent/INSTRUCT.md",p=R.join(this.workspaceRoot,"agent","INSTRUCT.md");try{await E.stat(p)}catch{a="prompts/INSTRUCT.md",p=R.join(this.workspaceRoot,"prompts","INSTRUCT.md")}try{await E.stat(p);let l=s.get(a)||s.get("agent/INSTRUCT.md")||s.get("prompts/INSTRUCT.md"),d=t.get(a)||t.get("agent/INSTRUCT.md")||t.get("prompts/INSTRUCT.md")||t.get("INSTRUCT.md"),c="pending";l?.status&&l.status!=="running"?c=l.status:d?.status&&(c=d.status);let g=i.has(a)?i.get(a):l?l.enabled:!0;o.unshift({id:"00",fileName:a,title:"Phase 0: Master Setup & Environment",status:c,enabled:g,isMasterSetup:!0,startTime:l?.startTime||d?.startTime,endTime:l?.endTime||d?.endTime,durationSeconds:l?.durationSeconds||d?.durationSeconds,tokenUsage:l?.tokenUsage||d?.tokenUsage,summary:l?.summary||d?.summary,error:l?.error||(c==="failed"?d?.summary:void 0)})}catch{}}this.phases=o,await this.notifyState()}async getPromptFiles(){let e="agent";try{await E.stat(R.join(this.workspaceRoot,"agent"))}catch{e="prompts"}let t=[{name:"Analysis Protocol",relPath:`${e}/PROTOCOL.md`},{name:"TidyProteomics Skills",relPath:`${e}/SKILL.md`},{name:"Experiment & Dataset Spec",relPath:"docs/experiment.md"},{name:"Shared Memory",relPath:"docs/notes.md"},{name:"Active Model Summary",relPath:"docs/llm.md"},{name:"Pipeline Summary",relPath:"logs/pipeline.md"}];try{let i=R.join(this.workspaceRoot,"logs"),o=await E.readdir(i,{withFileTypes:!0});for(let n of o)if(n.isDirectory()){let r=n.name,a=`logs/${r}/chat.md`,p=`logs/${r}/console.log`;t.push({name:`${r} Chat Trace`,relPath:a}),t.push({name:`${r} Console Log`,relPath:p})}}catch{}try{await E.stat(R.join(this.workspaceRoot,"logs/llm_chat.md")),t.push({name:"Legacy LLM Chat Log",relPath:"logs/llm_chat.md"})}catch{}try{await E.stat(R.join(this.workspaceRoot,`${e}/BIOLOGY.md`)),t.splice(1,0,{name:"Curated Biological Context",relPath:`${e}/BIOLOGY.md`})}catch{}try{await E.stat(R.join(this.workspaceRoot,`${e}/VARIABLES.md`)),t.splice(1,0,{name:"Legacy Dataset Variables",relPath:`${e}/VARIABLES.md`})}catch{}let s=[];for(let i of t){let o=!1;try{await E.stat(R.join(this.workspaceRoot,i.relPath)),o=!0}catch{o=!1}s.push({...i,exists:o})}return s}getPhases(){return[...this.phases]}togglePhase(e,t){let s=this.phases.find(i=>i.id===e);s&&(s.enabled=t,this.notifyState())}async addPhase(e,t){let s=e.endsWith(".md")?e:`${e}.md`,i=R.join(this.workspaceRoot,"analysis");await E.mkdir(i,{recursive:!0});let o=R.join(i,s),r=`### Phase: ${t||s.replace(/\.md$/,"").replace(/_/g," ")}
Construct and execute code for this phase, capturing output to logs.

#### Tasks:
- [ ] Task 1: Initialize step.
- [ ] Task 2: Execute analysis in R or shell.
- [ ] Checkpoint: Verify outputs and log files.
`;return await E.writeFile(o,r,"utf-8"),await this.rescanPhases(),o}async removePhase(e){let t=this.phases.findIndex(s=>s.id===e);if(t!==-1){let s=this.phases[t];if(!s.isMasterSetup)try{await E.unlink(R.join(this.workspaceRoot,"analysis",s.fileName))}catch{}this.phases.splice(t,1),await this.notifyState()}}async getFoldersStatus(){let e="agent";try{await E.stat(R.join(this.workspaceRoot,"agent"))}catch{e="prompts"}let t=[{name:"analysis",relPath:"analysis",description:"Phase Prompts (00_INSTALL.md .. 10_SYNTHESIS.md)"},{name:e,relPath:e,description:"Protocol, Variables & Skills (Cached Prefix)"},{name:"code",relPath:"code",description:"Generated Analysis Scripts"},{name:"tools",relPath:"tools",description:"Linter & Execution Helper Utilities"},{name:"docs",relPath:"docs",description:"Shared Memory (notes.md, llm.md) & Experiment Design"},{name:"logs",relPath:"logs",description:"Phase Chat Traces & Console Logs (logs/<phase>/)"},{name:"data",relPath:"data",description:"Raw Input Proteomics Data"}],s=[];if(!this.workspaceRoot)return s;for(let i of t){let o=R.join(this.workspaceRoot,i.relPath),n=!1,r=0;try{(await E.stat(o)).isDirectory()&&(n=!0,r=(await E.readdir(o)).filter(l=>!l.startsWith(".")).length)}catch{n=!1}s.push({...i,exists:n,itemCount:r})}return s}async getState(){let e=this.client.getConfig(),t=0,s=0,i=0,o=0;for(let l of this.phases)l.tokenUsage&&(t+=l.tokenUsage.promptTokens,s+=l.tokenUsage.completionTokens,i+=l.tokenUsage.totalTokens,o+=l.tokenUsage.cachedPromptTokens||0);let n=await this.getPromptFiles(),r=await this.getFoldersStatus(),a=r.find(l=>l.name==="analysis"),p=!this.workspaceRoot||!a||!a.exists||(a.itemCount||0)===0||this.phases.length===0;return{workingDirectory:this.workspaceRoot,workspaceName:this.workspaceRoot?R.basename(this.workspaceRoot):"No Folder Open",model:e.model,provider:e.provider,startTime:new Date().toISOString(),isRunning:this.isRunning,isFullPipelineRunning:this.isFullPipelineRunning,currentPhaseIndex:this.phases.findIndex(l=>l.status==="running"),phases:this.phases,promptFiles:n,folders:r,totalTokens:{promptTokens:t,completionTokens:s,totalTokens:i,cachedPromptTokens:o},isAnalysisMissingOrEmpty:p,literature:z(this.workspaceRoot),knowledgeCorpus:z(this.workspaceRoot)}}async notifyState(){try{let e=await this.getState();this.onStateChange(e)}catch(e){console.error("[PipelineOrchestrator] Error in notifyState:",e)}}stop(){this.shouldStop=!0,this.isFullPipelineRunning=!1;for(let e of this.phases)e.status==="running"&&(e.status="failed",e.error="Stopped by user");this.isRunning=!1,this.logPipeline("Execution stopped by user."),this.notifyState()}async pruneNotesFromPhase(e){if(!this.workspaceRoot)return;let t=this.phases.slice(e);if(t.length===0)return;let s=new Set;for(let o of t)s.add(o.fileName),s.add(R.basename(o.fileName)),o.isMasterSetup&&(s.add("agent/INSTRUCT.md"),s.add("prompts/INSTRUCT.md"),s.add("INSTRUCT.md"));let i=R.join(this.workspaceRoot,"docs","notes.md");try{let n=(await E.readFile(i,"utf-8")).split(/\n(?=###\s+)/),r=[];for(let p of n){let l=p.match(/- \*\*File\*\*:\s*`([^`]+)`/);if(l){let d=l[1].trim(),c=R.basename(d);if(s.has(d)||s.has(c))continue}r.push(p)}let a=r.join(`
`).replace(/\n{3,}/g,`

`).trim()+`
`;await E.writeFile(i,a,"utf-8")}catch{}}async runSinglePhase(e){if(this.isRunning){this.logPipeline("Execution busy: A pipeline or phase is already running. Please wait or stop it first.");return}let t=this.phases.findIndex(s=>s.id===e);if(t===-1){this.logPipeline(`Phase ID '${e}' not found.`);return}for(let s=t;s<this.phases.length;s++){let i=this.phases[s];s===t?(i.status="running",i.startTime=new Date().toISOString(),i.endTime=void 0,i.durationSeconds=void 0,i.tokenUsage=void 0,i.summary=void 0,i.error=void 0):(i.status="pending",i.startTime=void 0,i.endTime=void 0,i.durationSeconds=void 0,i.tokenUsage=void 0,i.summary=void 0,i.error=void 0)}await this.pruneNotesFromPhase(t),await this.notifyState(),this.isRunning=!0,this.isFullPipelineRunning=!1,this.shouldStop=!1;try{await this.executePhase(t)}catch(s){this.logPipeline(`Error running phase ${e}: ${s.message}`)}finally{this.isRunning=!1,this.isFullPipelineRunning=!1,await this.notifyState()}}async runFullPipeline(){if(this.isRunning){this.logPipeline("Execution busy: A pipeline is already running.");return}if(!this.workspaceRoot||this.phases.length===0){this.logPipeline("No analysis tasks found to execute. Please initialize an analysis pipeline first.");return}this.isRunning=!0,this.isFullPipelineRunning=!0,this.shouldStop=!1,this.logPipeline(`Starting autonomous run at ${new Date().toLocaleTimeString()}`),this.logPipeline(`Working Directory: ${this.workspaceRoot}`);try{for(let e=0;e<this.phases.length;e++){if(this.shouldStop){this.logPipeline("Execution stopped by user.");break}let t=this.phases[e];if(!t.enabled){this.logPipeline(`Skipping disabled phase: ${t.title}`);continue}if(await this.pruneNotesFromPhase(e),!await this.executePhase(e)){this.logPipeline(`Pipeline paused due to checkpoint failure in ${t.title}`);break}}}catch(e){this.logPipeline(`Full pipeline error: ${e.message}`)}finally{this.isRunning=!1,this.isFullPipelineRunning=!1,this.shouldStop=!1,await this.notifyState()}}async executePhase(e){let t=this.phases[e]?.id,s=()=>{if(t){let p=this.phases.find(l=>l.id===t);if(p)return p}return this.phases[e]},i=s();if(!i)return!1;let o=R.basename(i.fileName).replace(/\.md$/i,""),n=(i.title||"").replace(/^Phase\s+\d+:\s*/i,"").trim();this.chatLogger.setPhase(i.fileName),i.status="running",i.startTime=new Date().toISOString(),i.endTime=void 0,i.error=void 0,i.tokenUsage||(i.tokenUsage={promptTokens:0,completionTokens:0,totalTokens:0,cachedPromptTokens:0});let r=Date.now();await this.notifyState(),this.logPhase(o,`[Starting] ${n} (${i.fileName})`);let a;try{try{await Q(this.workspaceRoot,this.client.getConfig(),this.extensionVersion)}catch(f){console.warn("[PipelineOrchestrator] Could not write docs/llm.md before phase execution:",f)}let l=await new te(this.workspaceRoot).buildPhaseContext(i.fileName),d="";a=new se(i.fileName,i.title,this.client,this.tools,l,async f=>{if(f.type==="thought"){let S=String(f.data||"").trim(),P=S.match(/Starting Turn\s+(\d+\/\d+)\.{0,3}/i);if(P)this.logPhase(o,`Turn ${P[1]} ...`);else{let T=S.replace(/^[⚠️🔄❌✓💡]\s*/g,"").trim();this.logPhase(o,T)}}else if(f.type!=="text"){if(f.type==="tool_start"){let S=this.formatToolHeader(f.data.name,f.data.args),P=`[${this.ts()}] ${o}: `,T=Math.max(25,100-P.length-18),L=S;L.length>T&&(L=L.slice(0,T-3).trim()),L.endsWith("...")&&(L=L.slice(0,-3).trim()),d=`${P}${L} ...`,this.onLog(d,!1)}else if(f.type==="tool_end"){let S=d?d.replace(/\s*\.{3}$/,""):`[${this.ts()}] ${o}: [${f.data.name}]`;if(f.data.isError){this.onLog(`${S} ... \u274C  [failed]`,!0);let P="failed";if(f.data.result){let T=String(f.data.result).trim().split(`
`)[0].trim();T&&!T.startsWith("{")&&T.length<50&&(P=`failed: ${T.replace(/^Error:\s*/i,"")}`)}this.logPhase(o,`\u274C  ${P}`,!1)}else this.onLog(`${S} ...  \u2713 [completed]`,!0);d=""}else if(f.type==="tokens"){let S=s();S.tokenUsage={...f.data.totalUsage},await this.notifyState()}}},this.chatLogger,()=>this.shouldStop);let c=await a.run(),g=Math.max(1,Math.round((Date.now()-r)/1e3)),m=s();if(m.endTime=new Date().toISOString(),m.durationSeconds=g,m.tokenUsage=c.tokensUsed,m.summary=c.summary,c.success)return m.status="completed",this.logPhase(o,`[Completed] ${n} in ${g}s (${c.tokensUsed.totalTokens.toLocaleString()} tokens)`),await this.appendPhaseRecordToNotes(m),await this.notifyState(),!0;{m.status="failed",m.error=c.summary;let S=String(c.summary||"Phase failed").trim().split(`
`),P=S[0];this.logPhase(o,`\u274C [Failed] ${n}: ${P}`);for(let T=1;T<S.length;T++){let L=S[T].trim();L&&this.logPhase(o,`  ${L}`)}return await this.appendPhaseRecordToNotes(m),await this.notifyState(),!1}}catch(p){let l=s();return l.status="failed",l.error=p.message,a&&(!l.tokenUsage||l.tokenUsage.totalTokens===0)&&(l.tokenUsage=a.getTotalUsage()),this.logPhase(o,`\u274C Error in ${n}: ${p.message}`),await this.notifyState(),!1}}async appendPhaseRecordToNotes(e){let t=R.join(this.workspaceRoot,"docs","notes.md"),s=e.status==="failed"?"FAILED":"COMPLETED",i=e.summary||(e.status==="failed"?e.error||"Phase halted or failed.":"Phase checkpoints verified."),o=`
### ${e.title} - ${s}
- **File**: \`${e.fileName}\`
- **Duration**: ${e.durationSeconds}s
- **Start**: ${e.startTime}
- **End**: ${e.endTime}
- **Token Usage**: Total: ${e.tokenUsage?.totalTokens||"N/A"}, Prompt: ${e.tokenUsage?.promptTokens||"N/A"}, Completion: ${e.tokenUsage?.completionTokens||"N/A"}, Cached: ${e.tokenUsage?.cachedPromptTokens||0}
- **Summary**:
${i}

---
`;try{await E.mkdir(R.dirname(t),{recursive:!0});let n="";try{n=await E.readFile(t,"utf-8")}catch{n=`# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`}await E.writeFile(t,n+o,"utf-8")}catch(n){this.logPipeline(`Warning: Failed to update docs/notes.md: ${n}`)}}};var ne=class{constructor(e){this.config=e}updateConfig(e){this.config={...this.config,...e}}getConfig(){return{...this.config}}getTimeoutSeconds(){return this.config.timeoutSeconds&&this.config.timeoutSeconds>0?this.config.timeoutSeconds:600}getTimeoutMs(){return this.getTimeoutSeconds()*1e3}async chat(e){switch(this.config.provider){case"anthropic":return this.chatAnthropic(e);case"gemini":return this.chatGemini(e);case"openrouter":return this.chatOpenRouter(e);case"ollama":return this.chatOllama(e);case"openai":default:return this.chatOpenAI(e)}}async chatAnthropic(e){let t="https://api.anthropic.com/v1/messages",s=e.tools.map(x=>({name:x.name,description:x.description,input_schema:x.parameters})),i=[],o=0;for(;o<e.messages.length;){let x=e.messages[o];if(x.role==="system"){o++;continue}if(x.role==="tool"){let $=[];for(;o<e.messages.length&&e.messages[o].role==="tool";){let O=e.messages[o];$.push({type:"tool_result",tool_use_id:O.tool_call_id,content:O.content}),o++}i.push({role:"user",content:$});continue}else if(x.role==="assistant"&&x.tool_calls&&x.tool_calls.length>0){let $=[];x.content&&$.push({type:"text",text:x.content});for(let O of x.tool_calls)$.push({type:"tool_use",id:O.id,name:O.name,input:O.args});i.push({role:"assistant",content:$})}else i.push({role:x.role==="assistant"?"assistant":"user",content:x.content});o++}let n=[];for(let x of i){let $=n[n.length-1];if($&&$.role===x.role){let O=Array.isArray($.content)?$.content:[{type:"text",text:String($.content)}],ke=Array.isArray(x.content)?x.content:[{type:"text",text:String(x.content)}];$.content=[...O,...ke]}else n.push(x)}let r=[{type:"text",text:e.system,cache_control:{type:"ephemeral"}}],a=this.config.maxTokens||16384,p={model:this.config.model||"claude-3-7-sonnet-20250219",max_tokens:a,temperature:this.config.temperature??.2,system:r,messages:n,tools:s},l=this.getTimeoutSeconds(),d;try{d=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":this.config.apiKey,"anthropic-version":"2023-06-01","anthropic-beta":"prompt-caching-2024-07-31"},body:JSON.stringify(p),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(x){throw x.name==="TimeoutError"||x.message&&x.message.includes("timeout")?new Error(`Anthropic API request timed out after ${l}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):x}if(!d.ok){let x=await d.text();throw new Error(`Anthropic API error (${d.status}): ${x}`)}let c=await d.json(),g="",m=[];for(let x of c.content||[])x.type==="text"?(g+=x.text,e.onToken&&e.onToken(x.text)):x.type==="tool_use"&&m.push({id:x.id,name:x.name,args:x.input||{}});let f=c.stop_reason,S=f==="max_tokens";S&&console.warn(`[ProviderClient] Anthropic generation cut off: hit max_tokens limit (${a}).`);let P=c.usage?.cache_read_input_tokens||0,T=c.usage?.cache_creation_input_tokens||0,L=c.usage?.input_tokens||0,B=c.usage?.output_tokens||0,h=L+P+T,_=h+B,C={promptTokens:h,completionTokens:B,totalTokens:_,cachedPromptTokens:P};return{content:g,tool_calls:m.length>0?m:void 0,usage:C,finishReason:f,truncationDetected:S}}async chatGemini(e){let s=`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model||"gemini-1.5-pro"}:generateContent?key=${this.config.apiKey}`,i=[{functionDeclarations:e.tools.map(C=>({name:C.name,description:C.description,parameters:C.parameters}))}],o=[],n=0;for(;n<e.messages.length;){let C=e.messages[n];if(C.role==="system"){n++;continue}if(C.role==="tool"){let x=[];for(;n<e.messages.length&&e.messages[n].role==="tool";){let $=e.messages[n];x.push({functionResponse:{name:$.tool_name||$.tool_call_id||"tool_result",response:{output:$.content}}}),n++}o.push({role:"user",parts:x});continue}else if(C.role==="assistant"&&C.tool_calls){let x=[];C.content&&x.push({text:C.content});for(let $ of C.tool_calls)x.push({functionCall:{name:$.name,args:$.args}});o.push({role:"model",parts:x})}else o.push({role:C.role==="assistant"?"model":"user",parts:[{text:C.content}]});n++}let r=[];for(let C of o){let x=r[r.length-1];x&&x.role===C.role?x.parts.push(...C.parts):r.push(C)}let a=this.config.maxTokens||16384,p={systemInstruction:{parts:[{text:e.system}]},contents:r,tools:i,generationConfig:{temperature:this.config.temperature??.2,maxOutputTokens:a}},l=this.getTimeoutSeconds(),d;try{d=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(C){throw C.name==="TimeoutError"||C.message&&C.message.includes("timeout")?new Error(`Gemini API request timed out after ${l}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):C}if(!d.ok){let C=await d.text();throw new Error(`Gemini API error (${d.status}): ${C}`)}let c=await d.json(),g=c.candidates?.[0],m=g?.finishReason,f=m==="MAX_TOKENS";f&&console.warn(`[ProviderClient] Gemini generation cut off: hit MAX_TOKENS limit (${a}).`);let S="",P=[];for(let C of g?.content?.parts||[])C.text&&(S+=C.text,e.onToken&&e.onToken(C.text)),C.functionCall&&P.push({id:`call_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,name:C.functionCall.name,args:C.functionCall.args||{}});let T=c.usageMetadata?.promptTokenCount||0,L=c.usageMetadata?.candidatesTokenCount||0,B=c.usageMetadata?.cachedContentTokenCount||0,h=c.usageMetadata?.totalTokenCount??T+L,_={promptTokens:T,completionTokens:L,totalTokens:h,cachedPromptTokens:B};return{content:S,tool_calls:P.length>0?P:void 0,usage:_,finishReason:m,truncationDetected:f}}async chatOpenAI(e){let s=`${this.config.baseUrl||"https://api.openai.com/v1"}/chat/completions`,i=e.tools.map(h=>({type:"function",function:{name:h.name,description:h.description,parameters:h.parameters}})),o=[{role:"system",content:e.system}];for(let h of e.messages)h.role==="tool"?o.push({role:"tool",tool_call_id:h.tool_call_id,content:h.content}):h.role==="assistant"&&h.tool_calls?o.push({role:"assistant",content:h.content||null,tool_calls:h.tool_calls.map(_=>({id:_.id,type:"function",function:{name:_.name,arguments:JSON.stringify(_.args)}}))}):o.push({role:h.role,content:h.content});let n=this.config.maxTokens||16384,r={model:this.config.model||"gpt-4o",messages:o,tools:i.length>0?i:void 0,temperature:this.config.temperature??.2,max_tokens:n},a=this.getTimeoutSeconds(),p;try{p=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.config.apiKey}`},body:JSON.stringify(r),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(h){throw h.name==="TimeoutError"||h.message&&h.message.includes("timeout")?new Error(`OpenAI API request timed out after ${a}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):h}if(!p.ok){let h=await p.text();throw new Error(`OpenAI API error (${p.status}): ${h}`)}let l=await p.json(),d=l.choices?.[0]?.message,c=l.choices?.[0]?.finish_reason,g=c==="length"||c==="max_tokens",m=d?.content||"";m&&e.onToken&&e.onToken(m);let f=[];for(let h of d?.tool_calls||[])try{f.push({id:h.id,name:h.function.name,args:typeof h.function.arguments=="string"?JSON.parse(h.function.arguments):h.function.arguments||{}})}catch(_){console.error(`[ProviderClient] Failed to parse tool call arguments for ${h.function?.name}:`,_),g&&console.error(`[ProviderClient] Output truncated at max_tokens (${n}) with finish_reason="${c}". Tool call JSON was incomplete.`)}let S=l.usage?.prompt_tokens||0,P=l.usage?.completion_tokens||0,T=l.usage?.prompt_tokens_details?.cached_tokens||0,L=l.usage?.total_tokens??S+P,B={promptTokens:S,completionTokens:P,totalTokens:L,cachedPromptTokens:T};return{content:m,tool_calls:f.length>0?f:void 0,usage:B,finishReason:c,truncationDetected:g}}async chatOpenRouter(e){let s=`${(this.config.baseUrl||"https://openrouter.ai/api/v1").replace(/\/+$/,"")}/chat/completions`,i=e.tools.map(h=>({type:"function",function:{name:h.name,description:h.description,parameters:h.parameters}})),o=[{role:"system",content:e.system}];for(let h of e.messages)h.role==="tool"?o.push({role:"tool",tool_call_id:h.tool_call_id,content:h.content}):h.role==="assistant"&&h.tool_calls?o.push({role:"assistant",content:h.content||null,tool_calls:h.tool_calls.map(_=>({id:_.id,type:"function",function:{name:_.name,arguments:JSON.stringify(_.args)}}))}):o.push({role:h.role,content:h.content});let n=this.config.maxTokens||32768,r={model:this.config.model||"anthropic/claude-3.7-sonnet",messages:o,tools:i.length>0?i:void 0,temperature:this.config.temperature??.2,max_tokens:n},a=this.getTimeoutSeconds(),p;try{p=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.config.apiKey}`,"HTTP-Referer":"https://github.com/tidyproteomicsagent","X-Title":"TidyProteomicsAgent"},body:JSON.stringify(r),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(h){throw h.name==="TimeoutError"||h.message&&h.message.includes("timeout")?new Error(`OpenRouter API request timed out after ${a}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):h}if(!p.ok){let h=await p.text();throw new Error(`OpenRouter API error (${p.status}): ${h}`)}let l=await p.json(),d=l.choices?.[0]?.message,c=l.choices?.[0]?.finish_reason,g=c==="length"||c==="max_tokens",m=d?.content||"";m&&e.onToken&&e.onToken(m);let f=[];for(let h of d?.tool_calls||[])try{f.push({id:h.id,name:h.function.name,args:typeof h.function.arguments=="string"?JSON.parse(h.function.arguments):h.function.arguments||{}})}catch(_){console.error(`[ProviderClient] Failed to parse tool call arguments for ${h.function?.name}:`,_),g&&console.error(`[ProviderClient] Output truncated at max_tokens (${n}) with finish_reason="${c}". Tool call JSON was incomplete.`)}let S=l.usage?.prompt_tokens||0,P=l.usage?.completion_tokens||0,T=l.usage?.prompt_tokens_details?.cached_tokens??l.usage?.cache_read_input_tokens??0,L=l.usage?.total_tokens??S+P,B={promptTokens:S,completionTokens:P,totalTokens:L,cachedPromptTokens:T};return{content:m,tool_calls:f.length>0?f:void 0,usage:B,finishReason:c,truncationDetected:g}}async chatOllama(e){let t=(this.config.baseUrl||"http://localhost:11434").replace(/\/+$/,"");t.endsWith("/v1")||(t+="/v1");let s=`${t}/chat/completions`,i=e.tools.map(h=>({type:"function",function:{name:h.name,description:h.description,parameters:h.parameters}})),o=[{role:"system",content:e.system}];for(let h of e.messages)h.role==="tool"?o.push({role:"tool",tool_call_id:h.tool_call_id,content:h.content}):h.role==="assistant"&&h.tool_calls?o.push({role:"assistant",content:h.content||null,tool_calls:h.tool_calls.map(_=>({id:_.id,type:"function",function:{name:_.name,arguments:JSON.stringify(_.args)}}))}):o.push({role:h.role,content:h.content});let n=this.config.maxTokens||16384,r={model:this.config.model||"llama3.3:70b",messages:o,tools:i.length>0?i:void 0,temperature:this.config.temperature??.2,max_tokens:n,options:{num_predict:n},stream:!1},a={"Content-Type":"application/json"};this.config.apiKey&&(a.Authorization=`Bearer ${this.config.apiKey}`);let p=this.getTimeoutSeconds(),l;try{l=await fetch(s,{method:"POST",headers:a,body:JSON.stringify(r),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(h){throw h.name==="TimeoutError"||h.message&&h.message.includes("timeout")?new Error(`Remote Ollama API request timed out after ${p}s at ${s}. For local/remote 70B models, increase Request Timeout in settings.`):h}if(!l.ok){let h=await l.text();throw new Error(`Remote Ollama API error at ${s} (${l.status}): ${h}`)}let d=await l.json(),c=d.choices?.[0]?.message,g=d.choices?.[0]?.finish_reason||d.done_reason,m=g==="length",f=c?.content||"";f&&e.onToken&&e.onToken(f);let S=[];for(let h of c?.tool_calls||[])try{S.push({id:h.id||`call_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,name:h.function.name,args:typeof h.function.arguments=="string"?JSON.parse(h.function.arguments):h.function.arguments||{}})}catch(_){console.error(`[ProviderClient] Failed to parse tool call arguments for ${h.function?.name}:`,_),m&&console.error(`[ProviderClient] Output truncated at max_tokens (${n}) with finish_reason="${g}".`)}let P=d.usage?.prompt_tokens??d.prompt_eval_count??0,T=d.usage?.completion_tokens??d.eval_count??0,L=d.usage?.total_tokens??P+T,B={promptTokens:P,completionTokens:T,totalTokens:L,cachedPromptTokens:0};return{content:f,tool_calls:S.length>0?S:void 0,usage:B,finishReason:g,truncationDetected:m}}};var F=N(require("fs/promises")),J=N(require("fs")),ve=N(require("readline")),A=N(require("path")),we=require("child_process"),Se=require("util"),Be=(0,Se.promisify)(we.exec),ae=class{constructor(e){this.workspaceRoot=e;this.workspaceRoot=e||"",this.registerDefaultTools()}tools=new Map;setWorkspaceRoot(e){this.workspaceRoot=e||""}getDefinitions(){return Array.from(this.tools.values()).map(e=>e.definition)}async execute(e,t){let s=this.tools.get(e);if(!s)return{tool_call_id:"",content:`Error: Tool '${e}' not found. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,isError:!0};try{return{tool_call_id:"",content:await s.execute(t),isError:!1}}catch(i){return{tool_call_id:"",content:`Error executing tool '${e}': ${i.message||String(i)}`,isError:!0}}}resolvePath(e){let t=this.workspaceRoot||"";if(!t)throw new Error("No active workspace directory set.");let s=A.isAbsolute(e)?A.resolve(e):A.resolve(t,e),i=A.resolve(t);if(s!==i&&!s.startsWith(i+A.sep))throw new Error(`Security restriction: access to '${e}' outside workspace root is denied.`);return s}assertNotProtected(e){let t=this.workspaceRoot||"",s=A.isAbsolute(e)?A.resolve(e):A.resolve(t,e),i=t?A.relative(A.resolve(t),s).replace(/\\/g,"/"):e.replace(/\\/g,"/");if(["docs/llm.md","agent/PROTOCOL.md","agent/SKILL.md","agent/VARIABLES.md"].some(n=>i===n||i.endsWith("/"+n)))throw new Error(`Security Policy Violation: '${e}' is a protected user or extension specification file and cannot be modified by the agent. Record runtime logs in 'docs/notes.md' and biological findings across docs/ (observations.md, knowledge.md, websearch.md, literature.md).`)}registerDefaultTools(){this.tools.set("execute_command",{definition:{name:"execute_command",description:"Executes a shell command in the workspace directory (e.g. running Rscript code/01_inspect_dataset.R). Captures stdout and stderr.",parameters:{type:"object",properties:{command:{type:"string",description:"The shell command line to run"},timeoutMs:{type:"number",description:"Optional execution timeout in milliseconds (default: 600000ms / 10m)"}},required:["command"]}},execute:async e=>{let t=e.timeoutMs||6e5;try{let s=this.workspaceRoot;if(!s)throw new Error("Cannot execute command: No active workspace directory is configured.");let i=process.platform==="win32"?void 0:process.env.SHELL&&J.existsSync(process.env.SHELL)?process.env.SHELL:J.existsSync("/bin/bash")?"/bin/bash":"/bin/sh",{stdout:o,stderr:n}=await Be(e.command,{cwd:s,timeout:t,maxBuffer:10*1024*1024,shell:i}),r="";return o&&(r+=`STDOUT:
${o}
`),n&&(r+=`STDERR:
${n}
`),r.trim()||"Command executed successfully with no console output."}catch(s){let i=`Command failed with exit code ${s.code??"unknown"}
`;return s.stdout&&(i+=`STDOUT:
${s.stdout}
`),s.stderr&&(i+=`STDERR:
${s.stderr}
`),s.message&&(i+=`Error message: ${s.message}
`),i}}}),this.tools.set("read_file",{definition:{name:"read_file",description:"Reads file content from the workspace with optional startLine and maxLines for context economy.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative or absolute path to the file to read"},startLine:{type:"number",description:"Optional 1-based start line number"},maxLines:{type:"number",description:"Optional maximum lines to read (prevents dumping large logs or tables)"}},required:["filePath"]}},execute:async e=>{let t=this.resolvePath(e.filePath),s=Math.max(1,e.startLine||1),i=Math.max(1,e.maxLines||2e3),o=J.createReadStream(t,{encoding:"utf-8"}),n=ve.createInterface({input:o,crlfDelay:1/0}),r=[],a=0,p=0;for await(let d of n)a++,p=a,a>=s&&r.length<i&&r.push(`${a}: ${d}`);let l=r.length>0?s+r.length-1:s;return`File: ${e.filePath} (Lines ${s}-${l} of ${p}):
${r.join(`
`)}`}}),this.tools.set("write_file",{definition:{name:"write_file",description:"Creates or overwrites a file in the workspace with new content.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative path to the file to write"},content:{type:"string",description:"Complete text content to write into the file"}},required:["filePath","content"]}},execute:async e=>{this.assertNotProtected(e.filePath);let t=this.resolvePath(e.filePath);return await F.mkdir(A.dirname(t),{recursive:!0}),await F.writeFile(t,e.content,"utf-8"),`Successfully wrote ${e.content.length} characters to ${e.filePath}`}}),this.tools.set("replace_file_content",{definition:{name:"replace_file_content",description:"Replaces an exact target substring with replacement content in an existing file. Note: For analysis scripts and files under 150 lines, prefer 'write_file' to overwrite the complete file cleanly and avoid whitespace mismatch errors.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative path to the file to edit"},targetContent:{type:"string",description:"Exact substring to find and replace"},replacementContent:{type:"string",description:"New content to replace the target substring with"}},required:["filePath","targetContent","replacementContent"]}},execute:async e=>{this.assertNotProtected(e.filePath);let t=this.resolvePath(e.filePath),s=await F.readFile(t,"utf-8");if(!s.includes(e.targetContent))throw new Error(`Target content was not found in ${e.filePath}. Ensure exact whitespace and line match.`);let i=s.replace(e.targetContent,()=>e.replacementContent);return await F.writeFile(t,i,"utf-8"),`Successfully replaced content in ${e.filePath}`}}),this.tools.set("list_directory",{definition:{name:"list_directory",description:"Lists files and folders inside a given workspace directory.",parameters:{type:"object",properties:{dirPath:{type:"string",description:"Relative path to directory to inspect (e.g. 'data', 'logs', 'code')"}},required:["dirPath"]}},execute:async e=>{let t=this.resolvePath(e.dirPath||"."),i=(await F.readdir(t,{withFileTypes:!0})).map(o=>`${o.isDirectory()?"[DIR]":"[FILE]"} ${o.name}`).join(`
`);return`Directory '${e.dirPath}':
${i||"(empty)"}`}}),this.tools.set("check_checkpoint_gate",{definition:{name:"check_checkpoint_gate",description:"Checks whether required checkpoint files exist, are non-empty, and returns their file size.",parameters:{type:"object",properties:{requiredFiles:{type:"array",description:"Array of relative paths to files that must exist (e.g. ['logs/01_data_quality.log', 'data/tidyproteomics_data.rds'])",items:{type:"string"}}},required:["requiredFiles"]}},execute:async e=>{let t=[],s=!0;for(let i of e.requiredFiles){let o=this.resolvePath(i);if(i.includes("*")){let n=A.dirname(o),r=A.basename(i);try{let a=await F.readdir(n),p="^"+r.replace(/[-/\\^$+?.()|[\]{}]/g,"\\$&").replace(/\\\*/g,".*")+"$",l=new RegExp(p),d=a.filter(c=>l.test(c));if(d.length>0){let c=!1;for(let g of d){let m=await F.stat(A.join(n,g));m.size>0&&(c=!0,t.push(`PASS: ${A.join(A.dirname(i),g)} (size: ${m.size} bytes)`))}c||(t.push(`FAIL: ${i} matched files but all had 0 bytes`),s=!1)}else t.push(`FAIL: ${i} matched 0 files in directory`),s=!1}catch{t.push(`FAIL: Directory for ${i} does not exist`),s=!1}}else try{let n=await F.stat(o);n.size>0?t.push(`PASS: ${i} (size: ${n.size} bytes)`):(t.push(`FAIL: ${i} exists but has 0 bytes`),s=!1)}catch{t.push(`FAIL: ${i} does not exist`),s=!1}}return`Checkpoint Gate Status: ${s?"ALL CHECKPOINTS PASSED":"GATE FAILED"}
${t.join(`
`)}`}}),this.tools.set("complete_phase",{definition:{name:"complete_phase",description:"Signals that the current phase's objectives, code execution, and quality gates have completed successfully.",parameters:{type:"object",properties:{phaseName:{type:"string",description:"The name or filename of the completed phase"},summary:{type:"string",description:"Structured summary of findings, verified outputs, and gate status to update notes.md"}},required:["phaseName","summary"]}},execute:async e=>`PHASE_COMPLETED: ${e.phaseName}
Summary:
${e.summary}`}),this.tools.set("fail_phase",{definition:{name:"fail_phase",description:"Halts execution and marks the current phase as failed when an immutable specification gate, mandatory prerequisite, or unrecoverable error occurs. Use this to exit the phase loop immediately and provide actionable insights for the user to resolve before rerunning.",parameters:{type:"object",properties:{phaseName:{type:"string",description:"The name or filename of the phase (e.g. '00_INSTALL', '01_INSPECT')"},reason:{type:"string",description:"Concise summary of why the phase failed or was halted (e.g. 'Pre-flight Gate Failed: docs/experiment.md contains unconfigured placeholders')"},actionableInsights:{type:"string",description:"Specific, actionable instructions for the researcher explaining what to edit, configure, or verify to resolve the blocker before rerunning the phase."}},required:["phaseName","reason","actionableInsights"]}},execute:async e=>`PHASE_HALTED_FAILED: ${e.phaseName}
Reason: ${e.reason}
Actionable Insights:
${e.actionableInsights}`})}};var M=N(require("path")),j=N(require("fs")),xe=require("child_process");var re=class{constructor(e,t,s,i,o){this.literatureService=e;this.client=t;this.extensionPath=s;this.onProgress=i;this.onLog=o}isRunning=!1;shouldAbort=!1;getIsRunning(){return this.isRunning}abort(){this.shouldAbort=!0}ts(){return new Date().toTimeString().split(" ")[0]}async runIngestion(e){if(this.isRunning)throw new Error("An ingestion process is already running.");let t=this.literatureService.getViewState(),s=t.queue;if(s.length===0)throw new Error("No files in the ingestion queue. Select a literature folder first.");let i=this.literatureService.getWorkspaceRoot();if(!i)throw new Error("No active workspace directory set.");let o=t.literatureDir||t.corporaDir||U(i),n=M.join(o,M.basename(e));if(!j.existsSync(n))throw new Error(`Literature database does not exist: ${e}`);this.isRunning=!0,this.shouldAbort=!1;let r=0,a=0;this.onLog(`[${this.ts()}] Literature: Starting batch ingestion of ${s.length} files into ${M.basename(e)}`);try{for(let p=0;p<s.length;p++){if(this.shouldAbort){this.onLog(`[${this.ts()}] Literature: Ingestion aborted by user.`);break}let l=s[p];if(l.stage!=="indexed")try{await this.processItem(l,n,p+1,s.length),r++}catch(d){a++,l.stage="failed",l.message=d.message||String(d),this.literatureService.updateQueueItem(l.id,{stage:"failed",message:l.message}),this.onProgress({item:l,stage:"failed",message:l.message,processedCount:p+1,totalCount:s.length}),this.onLog(`[${this.ts()}] Literature: \u274C Failed to ingest ${l.fileName}: ${l.message}`)}}}finally{this.isRunning=!1,this.shouldAbort=!1,this.literatureService.syncWorkspaceScripts()}if(this.onLog(`[${this.ts()}] Literature: Ingestion batch complete: ${r} indexed, ${a} failed.`),r>0)try{this.onLog(`[${this.ts()}] Literature: Updating database accounting report (docs/literature_database.md)...`),await this.literatureService.generateReport(M.basename(e)),this.onLog(`[${this.ts()}] Literature: \u2713 Updated docs/literature_database.md`)}catch(p){this.onLog(`[${this.ts()}] Literature: Notice: could not auto-update report: ${p.message}`)}return{success:a===0,processed:r,errors:a}}async processItem(e,t,s,i){let o=(f,S)=>{e.stage=f,e.message=S,this.literatureService.updateQueueItem(e.id,{stage:f,message:S}),this.onProgress({item:e,stage:f,message:S,processedCount:s,totalCount:i})};o("parsing_pdf","Extracting text and tables..."),this.onLog(`[${this.ts()}] Literature: [${s}/${i}] Parsing ${e.fileName}...`);let n=this.findScript("extract_text_or_table.R"),r=this.literatureService.resolveRscript(),a=await this.execRJson(r,n,[e.absPath,"25"]);if(!a.ok)throw new Error(a.error||"Failed to extract text from file.");o("llm_extraction","LLM structured extraction..."),this.onLog(`[${this.ts()}] Literature: [${s}/${i}] Extracting assertions from ${e.fileName}...`);let p=`doi_${M.basename(e.fileName,M.extname(e.fileName))}`,l=null;if(a.kind==="pdf"?l=await this.llmExtractFromPdfText(e.fileName,a.text):l=await this.llmExtractFromTable(e.fileName,a.columns,a.rows),!l||!l.study)throw new Error("LLM failed to return structured extraction payload.");l.db_path=t,l.study&&l.study.study_id?p=l.study.study_id:l.study.study_id=p,l.study.filename=e.fileName,o("normalization","Normalizing symbols and orthologs..."),this.onLog(`[${this.ts()}] Literature: [${s}/${i}] Normalizing symbols via R (limma/babelgene)...`);let d;try{d=this.findScript("normalize_and_insert_literature.R")}catch{d=this.findScript("normalize_and_insert_corpus.R")}let c=this.literatureService.getWorkspaceRoot(),g=U(c);j.mkdirSync(g,{recursive:!0});let m=M.join(g,`_tmp_ingest_${Date.now()}.json`);try{j.writeFileSync(m,JSON.stringify(l,null,2),"utf-8");let f=await this.execRJson(r,d,[m,t]);if(!f.ok)throw new Error(f.error||"Normalization and insertion failed in R.");(f.assertions_inserted||0)===0?(o("indexed","Indexed 0 assertions (no explicit protein relationships found)"),this.onLog(`[${this.ts()}] Literature: Warning: 0 assertions extracted from ${e.fileName}. Check if document contains explicit protein interactions or is a conceptual overview.`)):(o("indexed",`Indexed ${f.assertions_inserted} assertions (${f.symbols_normalized||0} normalized)`),this.onLog(`[${this.ts()}] Literature: \u2713 [${s}/${i}] Indexed ${e.fileName}: ${f.assertions_inserted} assertions into DuckDB.`))}finally{try{j.existsSync(m)&&j.unlinkSync(m)}catch{}}}async llmExtractFromPdfText(e,t){let s=`You are an expert molecular biologist, biochemist, and biocuration specialist.
Your task is to extract structured scientific facts from literature text for ingestion into a Perturbation-Centric Knowledge Graph.

CRITICAL INSTRUCTIONS:
1. Extract ALL specific proteins, co-factors, adapters, substrates, binding partners, and pathway members mentioned across the text (Abstract, Introduction, Results, Figures, Discussion, or Review sections).
2. For experimental perturbation papers (KO, KD, chemical inhibition): extract altered targets, secondary hits, downstream destabilized targets, and co-regulated modules.
3. For structural, biochemical, or review papers: extract the primary target, its known physical interactors (e.g. adapters, co-chaperones, E3 ligases), direct substrates, and functional pathways (e.g. ERAD, autophagy, proteasome, ribosome quality control).
4. Do NOT return an empty list if any proteins, complexes, or molecular interactions are discussed in the paper. Always extract the relevant molecular entities with their biological relationship type.

OUTPUT SCHEMA (Must be raw valid JSON matching this exact structure):
{
  "study": {
    "study_id": "DOI or paper title slug (e.g. 10.1038/s41589-021-00800-0)",
    "title": "Full title of paper",
    "year": 2021,
    "core_thesis": "2-3 sentence summary of the primary biological conclusions"
  },
  "experimental_contexts": [
    {
      "context_id": "c1",
      "system_category": "cell_line | primary_cells | in_vivo_animal | human_clinical",
      "organism": "Homo sapiens | Mus musculus | Saccharomyces cerevisiae",
      "model_name": "HeLa | U2OS | HEK293T | C57BL/6",
      "perturbation_type": "CRISPR_KO | siRNA_KD | chemical_inhibitor | infection",
      "perturbation_target": "Exact perturbation target (e.g. VCP / p97, CB-5083)",
      "assay_modality": "whole_cell_proteomics | AP-MS | diGly_ubiquitinomics | RNA_seq | western_blot",
      "context_metadata": "Dose, timepoint, or condition details"
    }
  ],
  "molecular_assertions": [
    {
      "context_id": "c1",
      "raw_entity_name": "Exact protein/gene name used in paper (e.g. p97, p47, UBXD8, Cdc48)",
      "relationship_type": "ACCUMULATES_UP | DEPLETED_DOWN | PHYSICAL_INTERACTOR | DIRECT_SUBSTRATE | COMPENSATORY_PATHWAY | NO_CHANGE",
      "functional_module": "e.g. ERAD, RQC, Mitophagy, Proteasome, Golgi reassembly",
      "quantitative_note": "Fold change or statistical metric if stated",
      "evidence_quote": "Verbatim short sentence or table reference from the text"
    }
  ]
}

Return ONLY the raw JSON object. Do not include markdown code fences or conversational text.`,i=`Paper Filename: ${e}

Text Content:
${t.slice(0,5e4)}

Extract all studies, contexts, and molecular assertions.`,o=await this.client.chat({system:s,messages:[{role:"user",content:i}],tools:[]});return this.cleanAndParseJson(o.content)}async llmExtractFromTable(e,t,s){let i=`You are a biocuration specialist. Convert a supplementary proteomics/genomics table into structured assertions.
Return ONLY valid JSON with { "study": {...}, "experimental_contexts": [...], "molecular_assertions": [...] }.`,o=`Table Filename: ${e}
Columns: ${t.join(", ")}
Top Data Rows (JSON):
${JSON.stringify(s.slice(0,40),null,2)}

Extract the study, context, and all molecular assertions with raw_entity_name and relationship_type.`,n=await this.client.chat({system:i,messages:[{role:"user",content:o}],tools:[]});return this.cleanAndParseJson(n.content)}cleanAndParseJson(e){let t=(e||"").trim();t.startsWith("```json")?t=t.slice(7):t.startsWith("```")&&(t=t.slice(3)),t.endsWith("```")&&(t=t.slice(0,-3)),t=t.trim();let s=t.indexOf("{"),i=t.lastIndexOf("}");return s!==-1&&i!==-1&&(t=t.substring(s,i+1)),JSON.parse(t)}findScript(e){let s=[M.join(this.extensionPath,"templates","shared","tools","literature",e),M.join(this.extensionPath,"extension","templates","shared","tools","literature",e),M.join(__dirname,"..","templates","shared","tools","literature",e),M.join(__dirname,"..","..","templates","shared","tools","literature",e),M.join(this.extensionPath,"templates","shared","tools","corpus",e),M.join(this.extensionPath,"extension","templates","shared","tools","corpus",e),M.join(__dirname,"..","templates","shared","tools","corpus",e),M.join(__dirname,"..","..","templates","shared","tools","corpus",e)].find(i=>j.existsSync(i));if(s)return s;throw new Error(`Literature script '${e}' not found in extension templates.`)}execRJson(e,t,s){return new Promise(i=>{(0,xe.execFile)(e,[t,...s],{timeout:9e4,maxBuffer:15*1024*1024},(o,n,r)=>{let p=String(n||"").split(/\r?\n/).find(d=>d.startsWith("@@LITERATURE_JSON@@")||d.startsWith("@@CORPUS_JSON@@"));if(p)try{let d=p.startsWith("@@LITERATURE_JSON@@")?"@@LITERATURE_JSON@@":"@@CORPUS_JSON@@";i(JSON.parse(p.slice(d.length)));return}catch(d){i({ok:!1,error:`JSON parse error: ${d.message}`,stderr:r});return}let l=String(r||o?.message||"").trim();i({ok:!1,error:l||"R process finished without output.",stderr:r})})})}};var Y=class{constructor(e,t){this._extensionUri=e;this.context=t;this.workspaceRoot=this.getActiveWorkspaceRoot(),this.literatureService=new ee(this.workspaceRoot,this._extensionUri.fsPath,()=>u.workspace.getConfiguration("tidyproteomicsagent").get("rscriptPath")),this.corpusService=this.literatureService;let s=u.workspace.getConfiguration("tidyproteomicsagent"),i=s.get("baseUrl")||t.globalState.get("tidyproteomicsagent.baseUrl")||"",o=s.get("provider")||t.globalState.get("tidyproteomicsagent.provider")||"anthropic",n=s.get("model")||t.globalState.get("tidyproteomicsagent.model")||"claude-3-7-sonnet-20250219",r=s.get("maxTokens")||t.globalState.get("tidyproteomicsagent.maxTokens")||32768,a=s.get("timeoutSeconds")||t.globalState.get("tidyproteomicsagent.timeoutSeconds")||600,p=s.get("apiKey")||t.globalState.get("tidyproteomicsagent.apiKey")||"",l={provider:o,model:n,apiKey:p,baseUrl:i,maxTokens:r,timeoutSeconds:a};this.client=new ne(l),t.secrets.get("tidyproteomicsagent.apiKey").then(d=>{d&&(this.client.updateConfig({apiKey:d}),this.syncActiveModelSummary().catch(()=>{}),this.refreshState().catch(()=>{}))},d=>{console.warn("[SidebarViewProvider] Could not load API key from secrets:",d)}),this.tools=new ae(this.workspaceRoot),this.orchestrator=new oe(this.workspaceRoot,this.client,this.tools,d=>this.sendStateUpdate(d),(d,c)=>this.sendLog(d,c),this.getExtensionVersion()),this.ingestionRunner=new re(this.literatureService,this.client,this._extensionUri.fsPath,d=>{this.sendLiteratureProgress(d),this.sendLiteratureState()},(d,c)=>this.sendLog(d,c)),this.syncActiveModelSummary().catch(()=>{}),t.subscriptions.push(u.workspace.onDidChangeConfiguration(async d=>{if(d.affectsConfiguration("tidyproteomicsagent")){let c=u.workspace.getConfiguration("tidyproteomicsagent"),g=c.get("provider");this.client.updateConfig({...g?{provider:g}:{},model:c.get("model"),baseUrl:c.get("baseUrl"),maxTokens:c.get("maxTokens"),timeoutSeconds:c.get("timeoutSeconds")}),await this.syncActiveModelSummary(),this.refreshState().catch(()=>{})}}))}static viewType="tidyproteomicsagent.sidebarView";_view;orchestrator;client;tools;literatureService;corpusService;ingestionRunner;workspaceRoot;customWorkspaceRoot;onFolderChangedCallback;getExtensionVersion(){try{if(this.context.extension?.packageJSON?.version)return this.context.extension.packageJSON.version;let e=b.join(this._extensionUri.fsPath,"package.json");if(w.existsSync(e)){let t=JSON.parse(w.readFileSync(e,"utf-8"));if(t.version)return t.version}}catch{}return"0.1.0"}async syncActiveModelSummary(){if(this.workspaceRoot)try{let e=this.getExtensionVersion();this.orchestrator&&this.orchestrator.setExtensionVersion(e),await Q(this.workspaceRoot,this.client.getConfig(),e)}catch(e){console.error("[SidebarViewProvider] Error syncing active model summary:",e)}}setCustomWorkspaceRoot(e){this.customWorkspaceRoot=e,this.workspaceRoot=e,this.literatureService.setWorkspaceRoot(e)}getActiveWorkspaceRoot(){if(this.customWorkspaceRoot&&w.existsSync(this.customWorkspaceRoot))return this.customWorkspaceRoot;let e=u.workspace.workspaceFolders;if(e&&e.length>0){let s=u.window.activeTextEditor?.document;if(s&&s.uri.scheme==="file"){let o=u.workspace.getWorkspaceFolder(s.uri);if(o){let n=o.uri.fsPath;if(n.endsWith("/extension")||n.endsWith("\\extension")){let r=b.dirname(n);if(w.existsSync(b.join(r,"agent"))||w.existsSync(b.join(r,"prompts"))||w.existsSync(b.join(r,"analysis")))return r}return n}}let i=e[0].uri.fsPath;if(i.endsWith("/extension")||i.endsWith("\\extension")){let o=b.dirname(i);if(w.existsSync(b.join(o,"agent"))||w.existsSync(b.join(o,"prompts"))||w.existsSync(b.join(o,"analysis")))return o}return i}let t=u.window.activeTextEditor?.document;if(t&&t.uri.scheme==="file"){let s=b.dirname(t.uri.fsPath);if(w.existsSync(b.join(s,"agent"))||w.existsSync(b.join(s,"prompts"))||w.existsSync(b.join(s,"analysis")))return s;let i=b.dirname(s);return w.existsSync(b.join(i,"agent"))||w.existsSync(b.join(i,"prompts"))||w.existsSync(b.join(i,"analysis"))?i:s}return""}isScanning=!1;pendingScan=!1;async onWorkspaceChanged(){try{if(this.orchestrator?.getIsRunning())return;this.customWorkspaceRoot=void 0;let e=this.getActiveWorkspaceRoot(),t=e!==this.workspaceRoot;this.workspaceRoot=e,this.tools.setWorkspaceRoot(this.workspaceRoot),this.literatureService.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&(t?await this.orchestrator.setWorkingDirectory(this.workspaceRoot):await this.refreshPhases()),await this.syncActiveModelSummary()}catch(e){console.error("[SidebarViewProvider] Error in onWorkspaceChanged:",e)}}async refreshPhases(){if(!(this.isScanning||this.orchestrator?.getIsRunning())){this.isScanning=!0;try{if(this.orchestrator){await this.orchestrator.rescanPhases();let e=await this.orchestrator.getState();this.sendStateUpdate(e)}}catch(e){console.error("[SidebarViewProvider] Error in refreshPhases:",e)}finally{this.isScanning=!1,this.pendingScan&&!this.orchestrator?.getIsRunning()&&(this.pendingScan=!1,this.refreshPhases().catch(()=>{}))}}}async refreshState(){try{if(this.orchestrator){let e=await this.orchestrator.getState();this.sendStateUpdate(e)}}catch(e){console.error("[SidebarViewProvider] Error in refreshState:",e)}}async forceReload(){if(!(this.isScanning||this.orchestrator?.getIsRunning()))try{this.orchestrator&&await this.orchestrator.forceReloadFromDisk()}catch(e){console.error("[SidebarViewProvider] Error in forceReload:",e)}}async resetAllState(){if(!(this.isScanning||this.orchestrator?.getIsRunning()))try{await this.syncActiveModelSummary(),this.orchestrator&&await this.orchestrator.resetAllState()}catch(e){console.error("[SidebarViewProvider] Error in resetAllState:",e)}}resolveWebviewView(e,t,s){this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this._extensionUri]},e.webview.html=this._getHtmlForWebview(e.webview),setTimeout(()=>{this.syncActiveModelSummary().catch(()=>{}),this.refreshPhases().catch(()=>{})},150),e.onDidChangeVisibility(()=>{e.visible&&(this.orchestrator?.getIsRunning()?this.refreshState().catch(()=>{}):this.refreshPhases().catch(()=>{}))}),e.webview.onDidReceiveMessage(async i=>{try{switch(i.type){case"saveConfig":{let o=Number(i.maxTokens)||32768,n=Number(i.timeoutSeconds)||600;this.client.updateConfig({provider:i.provider,model:i.model,apiKey:i.apiKey,baseUrl:i.baseUrl,maxTokens:o,timeoutSeconds:n}),i.apiKey?await this.context.secrets.store("tidyproteomicsagent.apiKey",i.apiKey):i.apiKey===""&&await this.context.secrets.delete("tidyproteomicsagent.apiKey");try{let a=u.workspace.getConfiguration("tidyproteomicsagent");await a.update("provider",i.provider,u.ConfigurationTarget.Global),await a.update("model",i.model,u.ConfigurationTarget.Global),await a.update("baseUrl",i.baseUrl,u.ConfigurationTarget.Global),await a.update("maxTokens",o,u.ConfigurationTarget.Global),await a.update("timeoutSeconds",n,u.ConfigurationTarget.Global)}catch{}await this.context.globalState.update("tidyproteomicsagent.provider",i.provider),await this.context.globalState.update("tidyproteomicsagent.model",i.model),await this.context.globalState.update("tidyproteomicsagent.baseUrl",i.baseUrl),await this.context.globalState.update("tidyproteomicsagent.maxTokens",o),await this.context.globalState.update("tidyproteomicsagent.timeoutSeconds",n),await this.syncActiveModelSummary(),i.silent||u.window.showInformationMessage("TidyProteomicsAgent: Configuration saved!");let r=await this.orchestrator?.getState();r&&this.sendStateUpdate(r);break}case"startPipeline":{if(!this.workspaceRoot){u.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=this.client.getConfig();if(o.provider!=="ollama"&&!o.apiKey){u.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}await this.syncActiveModelSummary(),this.orchestrator?.runFullPipeline().catch(n=>{u.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${n.message}`)});break}case"runPhase":{if(!this.workspaceRoot){u.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=this.client.getConfig();if(o.provider!=="ollama"&&!o.apiKey){u.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}await this.syncActiveModelSummary(),this.orchestrator?.runSinglePhase(i.phaseId).catch(n=>{u.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${n.message}`)});break}case"togglePhase":{this.orchestrator?.togglePhase(i.phaseId,i.enabled);break}case"stopPipeline":{this.orchestrator?.stop();break}case"forceReload":{await this.forceReload();break}case"resetState":{await this.resetAllState();break}case"openFile":{if(!this.workspaceRoot){u.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=i.relPath||"",n=b.isAbsolute(o)?o:b.join(this.workspaceRoot,o);try{w.existsSync(n)||(w.mkdirSync(b.dirname(n),{recursive:!0}),w.writeFileSync(n,"","utf-8"));let r=await u.workspace.openTextDocument(n),a;if(i.line&&i.line>0){let l=Math.min(i.line-1,r.lineCount-1);a=new u.Range(l,0,l,0)}else if(i.searchText){let d=r.getText().indexOf(i.searchText);if(d!==-1){let c=r.positionAt(d);a=new u.Range(c,c)}}let p=await u.window.showTextDocument(r,a?{selection:a}:void 0);a&&p.revealRange(a,u.TextEditorRevealType.InCenter)}catch(r){u.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${o}: ${r.message}`)}break}case"authorizeConfoundingAndRerun":{if(!this.workspaceRoot)return;let o=b.join(this.workspaceRoot,"docs","experiment.md");try{if(w.existsSync(o)){let r=await w.promises.readFile(o,"utf-8"),a=!1;r.includes("Proceed With Potential Batch Confounding**: FALSE")?(r=r.replace("Proceed With Potential Batch Confounding**: FALSE","Proceed With Potential Batch Confounding**: TRUE"),a=!0):r.includes("Authorize Unadjusted Exploratory Comparison**: FALSE")&&(r=r.replace("Authorize Unadjusted Exploratory Comparison**: FALSE","Authorize Unadjusted Exploratory Comparison**: TRUE"),a=!0),a&&(await w.promises.writeFile(o,r,"utf-8"),u.window.showInformationMessage("TidyProteomicsAgent: Batch confounding authorized in docs/experiment.md. Rerunning phase..."))}let n=i.phaseId;n&&this.orchestrator&&(await this.syncActiveModelSummary(),this.orchestrator.runSinglePhase(n).catch(r=>{u.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${r.message}`)}))}catch(n){u.window.showErrorMessage(`TidyProteomicsAgent: Could not update docs/experiment.md: ${n.message}`)}break}case"openPhase":{if(!this.workspaceRoot){u.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=i.fileName||"",n=o.includes("/")||o.includes("\\")?b.join(this.workspaceRoot,o):b.join(this.workspaceRoot,"analysis",o);try{let r=await u.workspace.openTextDocument(n);await u.window.showTextDocument(r)}catch(r){u.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${o}: ${r.message}`)}break}case"copyPath":{this.workspaceRoot&&(await u.env.clipboard.writeText(this.workspaceRoot),u.window.showInformationMessage("TidyProteomicsAgent: Workspace path copied to clipboard!"));break}case"revealInOS":{this.workspaceRoot&&await u.commands.executeCommand("revealFileInOS",u.Uri.file(this.workspaceRoot));break}case"selectDirectory":{let o=await u.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder"});if(o&&o.length>0){let n=o[0].fsPath;this.customWorkspaceRoot=n,this.workspaceRoot=n,this.tools.setWorkspaceRoot(this.workspaceRoot),this.literatureService.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),await this.refreshPhases(),await this.syncActiveModelSummary(),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),u.window.showInformationMessage(`TidyProteomicsAgent: Active directory set to ${this.workspaceRoot}`)}break}case"rescanWorkspace":{await this.onWorkspaceChanged(),u.window.showInformationMessage("TidyProteomicsAgent: Rescanned workspace folders and phases.");break}case"createMissingFolders":{if(!this.workspaceRoot){u.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=["analysis","agent","code","data",b.join("data","raw"),"docs","logs","tools"];for(let n of o){let r=b.join(this.workspaceRoot,n);w.existsSync(r)||w.mkdirSync(r,{recursive:!0})}await this.refreshPhases(),u.window.showInformationMessage("TidyProteomicsAgent: Standard project folders initialized!");break}case"initWorkspace":{await this.initWorkspace(i.pipelineId||"differential_expression");break}case"promptInitWorkspace":{await this.promptInitWorkspace();break}case"requestState":{await this.refreshState(),this.sendCorpusState();break}case"literatureGetState":case"corpusGetState":{this.sendLiteratureState();break}case"literatureSelect":case"corpusSelect":{try{this.syncLiteratureWorkspace(),this.literatureService.setActiveLiterature(i.fileName),this.sendLiteratureState(),await this.refreshState()}catch(o){u.window.showErrorMessage(`TidyProteomicsAgent: ${o.message}`)}break}case"literatureCreate":case"corpusCreate":{try{this.syncLiteratureWorkspace();let o=await this.literatureService.createDatabase(i.name);u.window.showInformationMessage(`TidyProteomicsAgent: Created literature database '${o.fileName}'`),this.sendLiteratureState(),await this.refreshState()}catch(o){u.window.showErrorMessage(`TidyProteomicsAgent: ${o.message}`)}break}case"literatureToggleSynthesis":case"corpusToggleSynthesis":{this.syncLiteratureWorkspace(),this.literatureService.setUseInSynthesis(!!i.enabled),this.sendLiteratureState(),await this.refreshState();break}case"literatureStats":case"corpusStats":{this.syncLiteratureWorkspace();let o=await this.literatureService.getStats(i.fileName);if(this._view&&this._view.webview){let n=o.stats||o.data?.stats||o.data?.totals;this._view.webview.postMessage({type:"literatureStats",result:o,stats:n}),this._view.webview.postMessage({type:"corpusStats",result:o,stats:n})}break}case"literatureSearch":case"corpusSearch":{let o=await this.literatureService.search(i.query,i.limit||50,i.fileName);if(this._view&&this._view.webview){let n=o.results||o.data?.results||o.data?.rows||[];this._view.webview.postMessage({type:"literatureSearchResult",result:o,results:n}),this._view.webview.postMessage({type:"corpusSearchResult",result:o,results:n})}break}case"literaturePickFolder":case"corpusPickFolder":{let o=await u.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Literature Folder"});if(o&&o.length>0){let n=o[0].fsPath;try{this.literatureService.scanIngestFolder(n),this.sendLiteratureState(),u.window.showInformationMessage(`TidyProteomicsAgent: Found ${this.literatureService.getViewState().queue.length} document(s) for ingestion queue.`)}catch(r){u.window.showErrorMessage(`TidyProteomicsAgent: ${r.message}`)}}break}case"literatureClearQueue":case"corpusClearQueue":{this.literatureService.clearQueue(),this.sendLiteratureState();break}case"literatureStartIngest":case"corpusStartIngest":{let o=this.client.getConfig();if(o.provider!=="ollama"&&!o.apiKey){u.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key in the Provider tab before running literature extraction.");return}let n=i.fileName||this.literatureService.getConfig().activeLiterature||this.literatureService.getConfig().activeCorpus;if(!n){u.window.showErrorMessage("TidyProteomicsAgent: Please select or create an active literature database first.");return}this.sendLiteratureState(),this.ingestionRunner.runIngestion(n).then(async r=>{this.sendLiteratureState();let a=await this.literatureService.getStats(n);if(this._view&&this._view.webview){let p=a.stats||a.data?.stats||a.data?.totals;this._view.webview.postMessage({type:"literatureStats",result:a,stats:p}),this._view.webview.postMessage({type:"corpusStats",result:a,stats:p})}r.success?u.window.showInformationMessage(`TidyProteomicsAgent: Indexed ${r.processed} document(s) into ${n}!`):u.window.showWarningMessage(`TidyProteomicsAgent: Ingestion finished with ${r.errors} error(s). See log for details.`)}).catch(r=>{u.window.showErrorMessage(`TidyProteomicsAgent: Ingestion error - ${r.message}`),this.sendLiteratureState()});break}case"literatureAbortIngest":case"corpusAbortIngest":{this.ingestionRunner.abort(),u.window.showInformationMessage("TidyProteomicsAgent: Aborting ingestion...");break}case"literatureGenerateReport":{let o=i.fileName||this.literatureService.getConfig().activeLiterature||this.literatureService.getConfig().activeCorpus;if(!o){u.window.showErrorMessage("TidyProteomicsAgent: Please select or create an active literature database first.");return}try{u.window.showInformationMessage(`TidyProteomicsAgent: Generating accounting report for ${o}...`);let n=await this.literatureService.generateReport(o);if(n.ok){u.window.showInformationMessage("TidyProteomicsAgent: Generated docs/literature_database.md");let r=b.join(this.workspaceRoot||"","docs","literature_database.md");if(w.existsSync(r)){let a=await u.workspace.openTextDocument(r);await u.window.showTextDocument(a,{preview:!1})}}else u.window.showErrorMessage(`TidyProteomicsAgent: Failed to generate report: ${n.error}`)}catch(n){u.window.showErrorMessage(`TidyProteomicsAgent: Report generation error - ${n.message}`)}break}case"literatureOpenReport":{let o=b.join(this.workspaceRoot||"","docs","literature_database.md");if(w.existsSync(o)){let n=await u.workspace.openTextDocument(o);await u.window.showTextDocument(n,{preview:!1})}else{let n=this.literatureService.getConfig().activeLiterature||this.literatureService.getConfig().activeCorpus;if(n&&(await this.literatureService.generateReport(n)).ok&&w.existsSync(o)){let a=await u.workspace.openTextDocument(o);await u.window.showTextDocument(a,{preview:!1});return}u.window.showWarningMessage("TidyProteomicsAgent: docs/literature_database.md does not exist yet. Click 'Regenerate' first.")}break}}}catch(o){u.window.showErrorMessage(`TidyProteomicsAgent Error: ${o.message}`)}})}async promptInitWorkspace(){if(!this.workspaceRoot){let s=await u.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder to Initialize"});if(s&&s.length>0)this.workspaceRoot=s[0].fsPath,this.customWorkspaceRoot=this.workspaceRoot,this.tools.setWorkspaceRoot(this.workspaceRoot),this.literatureService.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),await this.syncActiveModelSummary();else return}let e=[{label:"$(symbol-structure) Differential Expression Pipeline",description:"Full 11-phase workflow (Install, Inspect, Normalize, Impute, Expression, Enrichment, Observations, Knowledge, WebSearch, Literature, Synthesis)",id:"differential_expression"},{label:"$(graph) Quality Control & Exploration Pipeline",description:"2-phase rapid QC and exploratory data analysis",id:"quality_control_only"}],t=await u.window.showQuickPick(e,{placeHolder:"Select a pipeline template to initialize this workspace"});t&&await this.initWorkspace(t.id)}async initWorkspace(e="differential_expression"){if(!this.workspaceRoot){let t=await u.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder to Initialize"});if(t&&t.length>0)this.workspaceRoot=t[0].fsPath,this.customWorkspaceRoot=this.workspaceRoot,this.tools.setWorkspaceRoot(this.workspaceRoot),this.literatureService.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),await this.syncActiveModelSummary();else return u.window.showErrorMessage("TidyProteomicsAgent: Please open or select a workspace folder first."),!1}try{let s=[b.join(this._extensionUri.fsPath,"templates"),b.join(this._extensionUri.fsPath,"extension","templates"),b.join(this.context.extensionPath,"templates"),b.join(this.context.extensionPath,"extension","templates"),b.join(__dirname,"..","templates"),b.join(__dirname,"..","..","templates"),b.join(__dirname,"templates"),b.join(this.workspaceRoot,"extension","templates"),b.join(this.workspaceRoot,"templates")].find(d=>w.existsSync(d));if(!s)return u.window.showErrorMessage("TidyProteomicsAgent: Template directory not found in extension or workspace."),!1;let i=["analysis","agent","code","data",b.join("data","raw"),"docs","logs","tools"];for(let d of i){let c=b.join(this.workspaceRoot,d);w.existsSync(c)||w.mkdirSync(c,{recursive:!0})}let o=(d,c,g=!1)=>{w.existsSync(d)&&(g||!w.existsSync(c))&&(w.mkdirSync(b.dirname(c),{recursive:!0}),w.copyFileSync(d,c))},n=b.join(s,"shared");if(w.existsSync(n)){o(b.join(n,"code","00_install.R"),b.join(this.workspaceRoot,"code","00_install.R"),!0),o(b.join(n,"tools","lint_tidyproteomics.R"),b.join(this.workspaceRoot,"tools","lint_tidyproteomics.R"),!0),o(b.join(n,"agent","PROTOCOL.md"),b.join(this.workspaceRoot,"agent","PROTOCOL.md"),!0),o(b.join(n,"agent","SKILL.md"),b.join(this.workspaceRoot,"agent","SKILL.md"),!0),o(b.join(n,"docs","experiment.md"),b.join(this.workspaceRoot,"docs","experiment.md"),!1),o(b.join(n,"docs","notes.md"),b.join(this.workspaceRoot,"docs","notes.md"),!1),o(b.join(n,"docs","concept.md"),b.join(this.workspaceRoot,"docs","concept.md"),!1),o(b.join(n,".gitignore"),b.join(this.workspaceRoot,".gitignore"),!1),o(b.join(n,"logs",".gitkeep"),b.join(this.workspaceRoot,"logs",".gitkeep"),!1),o(b.join(n,"data","raw",".gitkeep"),b.join(this.workspaceRoot,"data","raw",".gitkeep"),!1);let d=b.join(n,"tools","literature");if(w.existsSync(d)){let g=w.readdirSync(d).filter(m=>m.endsWith(".R"));for(let m of g)o(b.join(d,m),b.join(this.workspaceRoot,"tools","literature",m),!0)}let c=b.join(this.workspaceRoot,"literature");w.existsSync(c)||w.mkdirSync(c,{recursive:!0})}let r=b.join(s,"pipelines",e);if(w.existsSync(r)||(r=b.join(s,"pipelines","differential_expression")),w.existsSync(r)){let d=w.readdirSync(r).filter(c=>c.endsWith(".md"));for(let c of d)o(b.join(r,c),b.join(this.workspaceRoot,"analysis",c),!0)}else u.window.showWarningMessage(`TidyProteomicsAgent: Pipeline templates not found in ${s}/pipelines.`);await this.syncActiveModelSummary(),await this.refreshPhases();let a=await this.orchestrator?.getState();a&&this.sendStateUpdate(a);let p=e==="quality_control_only"?"Quality Control & Exploration":"Standard Differential Expression";u.window.showInformationMessage(`TidyProteomicsAgent: Workspace initialized with ${p} pipeline!`);let l=b.join(this.workspaceRoot,"docs","experiment.md");if(w.existsSync(l))try{let d=await u.workspace.openTextDocument(l);await u.window.showTextDocument(d)}catch{}return!0}catch(t){return u.window.showErrorMessage(`TidyProteomicsAgent: Failed to initialize workspace - ${t.message}`),!1}}startPipeline(){if(!this.workspaceRoot){u.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}if(this.orchestrator&&this.orchestrator.getPhases().length===0){u.window.showInformationMessage("TidyProteomicsAgent: No analysis tasks found to execute. Please initialize an analysis pipeline first.");return}this.syncActiveModelSummary().catch(()=>{}),this.orchestrator?.runFullPipeline().catch(e=>{u.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${e.message}`)})}async runSelectedPhase(){if(!this.workspaceRoot){u.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let e=this.client.getConfig();if(e.provider!=="ollama"&&!e.apiKey){u.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}if(await this.syncActiveModelSummary(),!this.orchestrator)return;let t=this.orchestrator.getPhases();if(t.length===0){u.window.showInformationMessage("TidyProteomicsAgent: No phases found to run.");return}let s=t.find(n=>n.status==="running")||t.find(n=>n.status==="pending"&&n.enabled!==!1)||t[0],i=t.map(n=>({label:n.title,description:`(${n.fileName}) - ${n.status.toUpperCase()}`,phaseId:n.id,picked:n.id===s?.id})),o=await u.window.showQuickPick(i,{placeHolder:"Select phase to run in isolation"});o&&this.orchestrator.runSinglePhase(o.phaseId).catch(n=>{u.window.showErrorMessage(`TidyProteomicsAgent: Error running phase - ${n.message}`)})}sendStateUpdate(e){if(this._view&&this._view.webview)try{let t=this._view.webview.postMessage({type:"stateUpdate",state:e});t&&typeof t.then=="function"&&t.then(void 0,s=>{console.warn("[SidebarViewProvider] Failed to post stateUpdate:",s)})}catch(t){console.warn("[SidebarViewProvider] Exception posting stateUpdate:",t)}}syncLiteratureWorkspace(){let e=this.getActiveWorkspaceRoot();return e&&e!==this.workspaceRoot?(this.workspaceRoot=e,this.tools.setWorkspaceRoot(e),this.literatureService.setWorkspaceRoot(e)):e&&this.literatureService.setWorkspaceRoot(e),this.workspaceRoot}sendLiteratureState(){if(this._view&&this._view.webview)try{this.syncLiteratureWorkspace();let e=this.literatureService.getViewState(this.ingestionRunner.getIsRunning()?"ingesting":void 0),t=this._view.webview.postMessage({type:"literatureState",state:e});t&&typeof t.then=="function"&&t.then(void 0,i=>{console.warn("[SidebarViewProvider] Failed to post literatureState:",i)});let s=this._view.webview.postMessage({type:"corpusState",state:e});s&&typeof s.then=="function"&&s.then(void 0,i=>{console.warn("[SidebarViewProvider] Failed to post corpusState:",i)})}catch(e){console.warn("[SidebarViewProvider] Exception posting literatureState:",e)}}sendCorpusState(){this.sendLiteratureState()}sendLiteratureProgress(e){if(this._view&&this._view.webview)try{this._view.webview.postMessage({type:"literatureProgress",event:e}),this._view.webview.postMessage({type:"corpusProgress",event:e})}catch(t){console.warn("[SidebarViewProvider] Exception posting literatureProgress:",t)}}sendCorpusProgress(e){this.sendLiteratureProgress(e)}sendLog(e,t=!1){if(this._view&&this._view.webview)try{let s=this._view.webview.postMessage({type:"log",text:e,updateLast:t});s&&typeof s.then=="function"&&s.then(void 0,i=>{console.warn("[SidebarViewProvider] Failed to post log:",i)})}catch(s){console.warn("[SidebarViewProvider] Exception posting log:",s)}}escapeAttr(e){return String(e||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}_cachedIcons;_loadIcons(){let e={},t=b.join(this._extensionUri.fsPath,"media");try{if(w.existsSync(t)){let s=w.readdirSync(t);for(let i of s)if(i.endsWith(".svg")){let o=i.replace(".svg",""),n=w.readFileSync(b.join(t,i),"utf-8");n=n.replace(/<\?xml[^>]*\?>/g,"").trim(),n=n.replace(/\s(width|height)="[^"]*"/g,""),o==="robot"?n=n.replace("<svg ",`<svg class="svg-icon svg-icon-${o}" `):n=n.replace("<svg ",`<svg class="svg-icon svg-icon-${o}" fill="currentColor" `),e[o]=n}}}catch(s){console.error("[SidebarViewProvider] Error loading SVG icons:",s)}return e}_getIcons(){return this._cachedIcons||(this._cachedIcons=this._loadIcons()),this._cachedIcons}_getHtmlForWebview(e){let t=this.client.getConfig(),s=this._getIcons();return`<!DOCTYPE html>
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
      grid-template-columns: repeat(5, minmax(0, 1fr));
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 3px;
      margin-bottom: 12px;
      gap: 2px;
      flex: 0 0 auto;
    }

    .badge-parsing_pdf { background: #3b82f6; color: #fff; animation: pulse 1.5s infinite; }
    .badge-llm_extraction { background: #8b5cf6; color: #fff; animation: pulse 1.5s infinite; }
    .badge-normalization { background: #f59e0b; color: #fff; animation: pulse 1.5s infinite; }
    .badge-indexed { background: var(--success); color: #fff; }
    .badge-skipped { background: #71717a; color: #fff; }

    /* Corpus Tab Styles */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 6px;
      margin-bottom: 8px;
    }
    .metric-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 4px;
      text-align: center;
    }
    .metric-num {
      font-size: 15px;
      font-weight: 700;
      color: var(--primary);
      font-variant-numeric: tabular-nums;
    }
    .metric-label {
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: var(--muted);
      margin-top: 2px;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-top: 6px;
    }
    .toggle-label {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--fg);
    }
    .toggle-desc {
      font-size: 9px;
      color: var(--muted);
    }
    .queue-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 5px 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 4px;
      font-size: 10.5px;
    }
    .queue-item-left {
      min-width: 0;
      flex: 1 1 auto;
    }
    .queue-item-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .queue-item-sub {
      font-size: 9px;
      color: var(--muted);
    }
    .search-result-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 6px;
    }
    .search-result-table th, .search-result-table td {
      border: 1px solid var(--border);
      padding: 4px 6px;
      text-align: left;
      vertical-align: top;
    }
    .search-result-table th {
      background: rgba(127, 127, 127, 0.08);
      font-size: 9px;
      text-transform: uppercase;
      color: var(--muted);
    }
    .quote-box {
      font-style: italic;
      color: #bfdbfe;
      font-size: 9px;
      margin-top: 2px;
      line-height: 1.3;
    }
    #corpusSynthesisToggle:checked + #corpusSynthesisSlider,
    #literatureSynthesisToggle:checked + #literatureSynthesisSlider {
      background: var(--primary) !important;
    }
    #corpusSynthesisSlider,
    #literatureSynthesisSlider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--vscode-input-border, #444);
      border-radius: 18px;
      transition: .2s;
    }
    #corpusSynthesisSlider:before,
    #literatureSynthesisSlider:before {
      position: absolute;
      content: "";
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: .2s;
    }
    #corpusSynthesisToggle:checked + #corpusSynthesisSlider:before,
    #literatureSynthesisToggle:checked + #literatureSynthesisSlider:before {
      transform: translateX(16px);
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
    #pane-pipeline.active,
    #pane-literature.active {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    #activePipelineDashboard {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    #activePipelineDashboard[style*="display: block"],
    #activePipelineDashboard[style*="display: flex"] {
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
    .section, .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 10px;
      flex: 0 0 auto;
    }
    .terminal-section,
    .queue-section {
      display: flex !important;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 150px;
      margin-bottom: 0 !important;
    }
    .terminal-section .section-header,
    .queue-section .section-header {
      flex: 0 0 auto;
    }
    .terminal-section .terminal {
      flex: 1 1 0;
      min-height: 110px;
      height: auto;
    }
    .queue-section .queue-list,
    #literatureQueueList {
      flex: 1 1 0;
      min-height: 80px;
      overflow-y: auto;
      margin-bottom: 8px;
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
      flex-direction: column;
      align-items: stretch;
      gap: 5px;
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
    .task-card.task-card-failed {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.04);
    }
    .task-main-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
    }
    .task-insight-box {
      background: rgba(239, 68, 68, 0.09);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 4px;
      padding: 5px 7px;
      font-size: 10px;
      line-height: 1.35;
    }
    .task-insight-header {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
      color: #f87171;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }
    .task-insight-icon {
      font-size: 11px;
    }
    .task-insight-title {
      font-weight: 700;
    }
    .task-insight-body {
      color: #fecaca;
      word-break: break-word;
      font-family: var(--vscode-font-family, sans-serif);
    }
    .task-insight-actions {
      display: flex;
      gap: 6px;
      margin-top: 5px;
      flex-wrap: wrap;
    }
    .btn-insight-link {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #ffffff !important;
      border: 1px solid rgba(239, 68, 68, 0.45) !important;
      border-radius: 3px !important;
      padding: 2px 7px !important;
      font-size: 9.5px !important;
      font-weight: 600 !important;
      cursor: pointer;
      line-height: 1.3 !important;
      transition: all 0.15s ease;
    }
    .btn-insight-link:hover {
      background: rgba(239, 68, 68, 0.35) !important;
      border-color: rgba(239, 68, 68, 0.7) !important;
      color: #ffffff !important;
    }
    .btn-insight-action-primary {
      background: rgba(34, 197, 94, 0.25) !important;
      color: #ffffff !important;
      border: 1px solid rgba(34, 197, 94, 0.55) !important;
      border-radius: 3px !important;
      padding: 2px 7px !important;
      font-size: 9.5px !important;
      font-weight: 600 !important;
      cursor: pointer;
      line-height: 1.3 !important;
      transition: all 0.15s ease;
    }
    .btn-insight-action-primary:hover {
      background: rgba(34, 197, 94, 0.45) !important;
      border-color: rgba(34, 197, 94, 0.85) !important;
      color: #ffffff !important;
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
      white-space: pre;
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
      flex: 1 1 0;
      height: auto;
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
    <button type="button" class="tab-btn" data-tab="literature" onclick="window.switchTab && window.switchTab('literature')" title="Literature Database & Ingestion">
      <span class="tab-icon">${s.database||""}</span>
      <span class="tab-label">Literature</span>
      <span class="tab-indicator" id="literatureIndicator"></span>
    </button>
  </div>

  <!-- TAB 1: PIPELINE -->
  <div class="tab-pane active" id="pane-pipeline">
    <!-- Loading Container (shown briefly while initializing) -->
    <div id="loadingPipelineContainer" style="text-align:center; padding:15px; color:var(--muted); font-size:11px;">
      Scanning analysis pipeline...
    </div>

    <!-- State A: No Workspace Folder Open -->
    <div id="noFolderContainer" style="display:none; text-align:center; padding:15px; color:var(--muted);">
      No folder opened in VS Code.<br><br>Use <b>File &gt; Open Folder...</b> or the <b>Directory</b> tab to choose a folder.
    </div>

    <!-- State B: Initialize Analysis Pipeline (shown ONLY when analysis/ is missing or empty) -->
    <div id="initPipelineSection" style="display:none;">
      <div style="background:var(--vscode-sideBar-background); border:1px solid var(--vscode-widget-border, #333); border-radius:6px; padding:12px; margin:4px 0;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
          <span style="font-size:15px; display:inline-flex; align-items:center;">${s["rocket-lunch"]||""}</span>
          <div style="font-weight:600; font-size:12px; color:var(--vscode-foreground);">Initialize Analysis Pipeline</div>
        </div>
        <div style="font-size:11px; color:var(--muted); line-height:1.4; margin-bottom:10px;">
          No analysis tasks found in this directory. Choose a pipeline to initialize your workspace with subdirectories, R setup scripts, and templates:
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); display:block; margin-bottom:4px;">Pipeline Template</label>
          <select id="pipelineTemplateSelect" style="width:100%; box-sizing:border-box; padding:5px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;">
            <option value="differential_expression">Differential Expression (11-Phase Pipeline)</option>
            <option value="quality_control_only">Quality Control &amp; Exploration (2-Phase QC)</option>
          </select>
        </div>
        <div id="pipelineDescription" style="font-size:10px; color:var(--muted); margin-bottom:12px; background:rgba(255,255,255,0.03); padding:6px 8px; border-radius:4px; border-left:3px solid var(--primary, #007acc); line-height:1.4;">
          <b>Phases:</b> 00_INSTALL \u2794 01_INSPECT \u2794 02_NORMALIZE \u2794 03_IMPUTE \u2794 04_EXPRESSION \u2794 05_ENRICHMENT \u2794 06_OBSERVATIONS \u2794 07_KNOWLEDGE \u2794 08_WEBSEARCH \u2794 09_LITERATURE \u2794 10_SYNTHESIS.<br>
          <i>Includes environment readiness, QC inspection, normalization benchmarking, imputation, differential expression, pathway enrichment, primary observations, internal knowledge, web search, literature database interrogation, and final manuscript synthesis report.</i>
        </div>
        <button type="button" id="initWorkspaceBtn" data-action="initWorkspace" class="btn-primary" style="width:100%; padding:7px 10px; font-size:11px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">
          <span>${s.sparkles||""}</span> Initialize Working Directory
        </button>
      </div>
    </div>

    <!-- State C: Active Pipeline Dashboard (shown when analysis/ exists and has tasks) -->
    <div id="activePipelineDashboard" style="display:none;">
      <!-- Pipeline Execution Controls -->
      <div class="section">
        <div style="display:flex; gap:4px; margin-bottom:8px;">
          <button id="startPipelineBtn" style="width:100%;">${s.play||""} Run Analysis Pipeline</button>
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
            <button class="btn-sm" id="viewChatLogBtn" title="Open master logs/pipeline.md in VS Code">${s.list||""} Pipeline Log</button>
            <button class="btn-sm" id="clearLogBtn">Clear</button>
          </div>
        </div>
        <div class="terminal" id="terminalLog">TidyProteomicsAgent ready. Phases discovered from analysis/*.md.</div>
      </div>
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

  <!-- TAB 5: LITERATURE -->
  <div class="tab-pane" id="pane-literature" style="display:none;">
    <!-- Literature Selector & Creator Section -->
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${s.database||""} Literature Knowledge Database
        </h3>
        <span class="badge badge-idle" id="literatureActiveBadge">NO DATABASE</span>
      </div>

      <div style="margin-bottom:8px;">
        <label style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); display:block; margin-bottom:4px;">Active Literature Database</label>
        <select id="literatureSelect" style="width:100%; box-sizing:border-box; padding:5px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;">
          <option value="">(No database selected)</option>
        </select>
      </div>

      <!-- New Literature Input -->
      <div style="display:flex; gap:6px; margin-bottom:8px;">
        <input type="text" id="newLiteratureInput" placeholder="New database name (e.g. p97_vcp)..." style="flex:1; padding:4px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;" />
        <button type="button" class="btn-sm" id="createLiteratureBtn" style="white-space:nowrap;">${s.sparkles||""} Create</button>
      </div>

      <!-- Toggle: Use in Synthesis Pipeline -->
      <div class="toggle-row" id="literatureSynthesisToggleRow" style="cursor:pointer;">
        <div style="flex:1;">
          <label for="literatureSynthesisToggle" class="toggle-label" style="cursor:pointer;">Use Active Database in Synthesis</label>
          <div class="toggle-desc">Orchestrates two-way R interrogation in Phase 09</div>
        </div>
        <label for="literatureSynthesisToggle" style="position:relative; display:inline-block; width:34px; height:18px; margin:0; flex-shrink:0; cursor:pointer;">
          <input type="checkbox" id="literatureSynthesisToggle" style="position:absolute; opacity:0; width:100%; height:100%; top:0; left:0; z-index:2; cursor:pointer; margin:0;" />
          <span id="literatureSynthesisSlider"></span>
        </label>
      </div>
    </div>

    <!-- Live Inspector Metrics Section -->
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${s.stats||""} Literature Metrics
        </h3>
        <button type="button" id="refreshLiteratureStatsBtn" class="btn-icon" title="Refresh metrics from DuckDB" style="padding:2px 4px; font-size:10px;">
          ${s.refresh||"\u21BB"}
        </button>
      </div>

      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-num" id="metricStudies">0</div>
          <div class="metric-label">Studies</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricContexts">0</div>
          <div class="metric-label">Contexts</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricAssertions">0</div>
          <div class="metric-label">Assertions</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricSymbols">0</div>
          <div class="metric-label">Symbols</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricOrganisms">0</div>
          <div class="metric-label">Organisms</div>
        </div>
        <div class="metric-card">
          <div class="metric-num" id="metricPerturbations">0</div>
          <div class="metric-label">Perturbations</div>
        </div>
      </div>

      <div style="display:flex; gap:6px; margin-top:8px;">
        <button type="button" class="btn-sm btn-secondary" id="openLiteratureReportBtn" style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px;" title="Open docs/literature_database.md in VS Code">
          ${s.summary||""} Open Report
        </button>
        <button type="button" class="btn-sm btn-secondary" id="regenerateLiteratureReportBtn" style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px;" title="Regenerate docs/literature_database.md from active DuckDB">
          ${s.refresh||"\u21BB"} Regenerate
        </button>
      </div>
    </div>

    <!-- Preview Search Section -->
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${s.summary||""} Assertion Search
        </h3>
      </div>
      <div style="display:flex; gap:6px; margin-bottom:6px;">
        <input type="text" id="literatureSearchInput" placeholder="Search gene, alias, or module (e.g. VCP, ERAD)..." style="flex:1; padding:4px 8px; font-size:11px; background:var(--vscode-input-background, #252526); color:var(--vscode-input-foreground, #cccccc); border:1px solid var(--vscode-input-border, #3c3c3c); border-radius:4px; outline:none;" />
        <button type="button" class="btn-sm btn-secondary" id="literatureSearchBtn">Search</button>
      </div>
      <div id="literatureSearchResults" style="max-height:180px; overflow-y:auto; font-size:10.5px; border:1px solid var(--border); border-radius:4px; padding:4px; background:var(--bg);">
        <div style="color:var(--muted); font-size:10px; text-align:center; padding:10px;">Enter a query above to search assertions in the active literature database.</div>
      </div>
    </div>

    <!-- PDF & Supplementary Table Ingestion Queue Section -->
    <div class="section queue-section">
      <div class="section-header">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${s.layers||""} Ingestion Queue
        </h3>
        <span class="badge badge-idle" id="ingestQueueBadge">0 FILES</span>
      </div>

      <div style="display:flex; gap:6px; margin-bottom:8px; flex:0 0 auto;">
        <button type="button" class="btn-secondary btn-sm" id="pickFolderBtn" style="flex:1;">
          ${s["folder-open"]||""} Select Literature Folder...
        </button>
        <button type="button" class="btn-secondary btn-sm" id="clearQueueBtn" title="Clear pending queue">
          Clear
        </button>
      </div>

      <div id="literatureQueueList" class="queue-list">
        <div style="color:var(--muted); font-size:10px; text-align:center; padding:12px;">
          No documents in queue.<br>Select a folder containing PDFs or supplementary tables (.xlsx/.csv).
        </div>
      </div>

      <div style="display:flex; gap:6px; flex:0 0 auto;">
        <button type="button" class="btn-primary btn-sm" id="startIngestBtn" style="flex:1; padding:6px; font-weight:600;">
          ${s.play||""} Run Ingestion Pipeline
        </button>
        <button type="button" class="btn-stop btn-sm" id="abortIngestBtn" style="display:none; padding:6px; font-weight:600;">
          ${s.stop||""} Abort
        </button>
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
            p.style.display = (tabId === "pipeline" || tabId === "literature" || tabId === "corpus") ? "flex" : "block";
          } else {
            p.classList.remove("active");
            p.style.display = "none";
          }
        });

        if (tabId === "literature" || tabId === "corpus") {
          vscode.postMessage({ type: "literatureGetState" });
        }

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
    const loadingPipelineContainer = document.getElementById("loadingPipelineContainer");
    const noFolderContainer = document.getElementById("noFolderContainer");
    const initPipelineSection = document.getElementById("initPipelineSection");
    const activePipelineDashboard = document.getElementById("activePipelineDashboard");
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
          const searchText = target.getAttribute("data-search");
          if (relPath) vscode.postMessage({ type: "openFile", relPath: relPath, searchText: searchText || "" });
        } else if (action === "authorizeConfoundingAndRerun") {
          const phaseId = target.getAttribute("data-phase-id");
          if (phaseId) vscode.postMessage({ type: "authorizeConfoundingAndRerun", phaseId: phaseId });
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
            descEl.innerHTML = "<b>Phases:</b> 00_INSTALL \u2794 01_INSPECT.<br><i>Includes: Workspace readiness, data import, replicate CV analysis, quantifiable fraction evaluation, and PCA separation.</i>";
          } else {
            descEl.innerHTML = "<b>Phases:</b> 00_INSTALL \u2794 01_INSPECT \u2794 02_NORMALIZE \u2794 03_IMPUTE \u2794 04_EXPRESSION \u2794 05_ENRICHMENT \u2794 06_OBSERVATIONS \u2794 07_KNOWLEDGE \u2794 08_WEBSEARCH \u2794 09_LITERATURE \u2794 10_SYNTHESIS.<br><i>Includes: Environment readiness, QC inspection, normalization benchmarking, imputation, differential expression, pathway enrichment, primary observations, internal knowledge, web search, literature database interrogation, and final manuscript synthesis report.</i>";
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
    if (viewChatLogBtn) viewChatLogBtn.addEventListener("click", () => vscode.postMessage({ type: "openFile", relPath: "logs/pipeline.md" }));

    if (copyPathBtn) copyPathBtn.addEventListener("click", () => vscode.postMessage({ type: "copyPath" }));
    if (revealOSBtn) revealOSBtn.addEventListener("click", () => vscode.postMessage({ type: "revealInOS" }));
    if (chooseDirBtn) chooseDirBtn.addEventListener("click", () => vscode.postMessage({ type: "selectDirectory" }));
    if (rescanDirBtn) rescanDirBtn.addEventListener("click", () => vscode.postMessage({ type: "rescanWorkspace" }));
    if (createFoldersBtn) createFoldersBtn.addEventListener("click", () => vscode.postMessage({ type: "createMissingFolders" }));
    const initPipelineQuickBtn = document.getElementById("initPipelineQuickBtn");
    if (initPipelineQuickBtn) initPipelineQuickBtn.addEventListener("click", () => vscode.postMessage({ type: "promptInitWorkspace" }));

    function escapeAttr(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;");
    }

    // Literature Tab Elements
    let currentActiveLiterature = "";
    const literatureSelect = document.getElementById("literatureSelect") || document.getElementById("corpusSelect");
    const newLiteratureInput = document.getElementById("newLiteratureInput") || document.getElementById("newCorpusInput");
    const createLiteratureBtn = document.getElementById("createLiteratureBtn") || document.getElementById("createCorpusBtn");
    const literatureSynthesisToggle = document.getElementById("literatureSynthesisToggle") || document.getElementById("corpusSynthesisToggle");
    const literatureActiveBadge = document.getElementById("literatureActiveBadge") || document.getElementById("corpusActiveBadge");
    const refreshLiteratureStatsBtn = document.getElementById("refreshLiteratureStatsBtn") || document.getElementById("refreshCorpusStatsBtn");
    const metricStudies = document.getElementById("metricStudies");
    const metricContexts = document.getElementById("metricContexts");
    const metricAssertions = document.getElementById("metricAssertions");
    const metricSymbols = document.getElementById("metricSymbols");
    const metricOrganisms = document.getElementById("metricOrganisms");
    const metricPerturbations = document.getElementById("metricPerturbations");
    const literatureSearchInput = document.getElementById("literatureSearchInput") || document.getElementById("corpusSearchInput");
    const literatureSearchBtn = document.getElementById("literatureSearchBtn") || document.getElementById("corpusSearchBtn");
    const literatureSearchResults = document.getElementById("literatureSearchResults") || document.getElementById("corpusSearchResults");
    const ingestQueueBadge = document.getElementById("ingestQueueBadge");
    const pickFolderBtn = document.getElementById("pickFolderBtn");
    const clearQueueBtn = document.getElementById("clearQueueBtn");
    const literatureQueueList = document.getElementById("literatureQueueList") || document.getElementById("corpusQueueList");
    const startIngestBtn = document.getElementById("startIngestBtn");
    const abortIngestBtn = document.getElementById("abortIngestBtn");
    const literatureIndicator = document.getElementById("literatureIndicator") || document.getElementById("corpusIndicator");

    if (literatureSelect) {
      literatureSelect.addEventListener("change", function () {
        const val = literatureSelect.value;
        vscode.postMessage({ type: "literatureSelect", fileName: val });
        if (val) {
          vscode.postMessage({ type: "literatureStats", fileName: val });
        } else {
          renderLiteratureStats({ study_count: 0, context_count: 0, assertion_count: 0, unique_symbols: 0, organism_count: 0, perturbation_count: 0 });
        }
      });
    }

    if (createLiteratureBtn && newLiteratureInput) {
      createLiteratureBtn.addEventListener("click", function () {
        const name = (newLiteratureInput.value || "").trim();
        if (!name) return;
        vscode.postMessage({ type: "literatureCreate", name: name });
        newLiteratureInput.value = "";
      });
      newLiteratureInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          createLiteratureBtn.click();
        }
      });
    }

    if (literatureSynthesisToggle) {
      literatureSynthesisToggle.addEventListener("change", function () {
        vscode.postMessage({ type: "literatureToggleSynthesis", enabled: !!literatureSynthesisToggle.checked });
      });
    }

    const literatureSynthesisToggleRow = document.getElementById("literatureSynthesisToggleRow");
    if (literatureSynthesisToggleRow && literatureSynthesisToggle) {
      literatureSynthesisToggleRow.addEventListener("click", function (e) {
        if (e.target !== literatureSynthesisToggle && e.target.tagName !== "LABEL") {
          literatureSynthesisToggle.checked = !literatureSynthesisToggle.checked;
          literatureSynthesisToggle.dispatchEvent(new Event("change"));
        }
      });
    }

    if (refreshLiteratureStatsBtn) {
      refreshLiteratureStatsBtn.addEventListener("click", function () {
        refreshLiteratureStatsBtn.style.transform = "rotate(360deg)";
        refreshLiteratureStatsBtn.style.transition = "transform 0.5s ease";
        setTimeout(function () {
          refreshLiteratureStatsBtn.style.transform = "none";
          refreshLiteratureStatsBtn.style.transition = "none";
        }, 500);
        const val = (literatureSelect && literatureSelect.value) || currentActiveLiterature || "";
        if (val) {
          vscode.postMessage({ type: "literatureStats", fileName: val });
        } else {
          renderLiteratureStats({ study_count: 0, context_count: 0, assertion_count: 0, unique_symbols: 0, organism_count: 0, perturbation_count: 0 });
        }
      });
    }

    const openLiteratureReportBtn = document.getElementById("openLiteratureReportBtn");
    const regenerateLiteratureReportBtn = document.getElementById("regenerateLiteratureReportBtn");
    if (openLiteratureReportBtn) {
      openLiteratureReportBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "literatureOpenReport" });
      });
    }
    if (regenerateLiteratureReportBtn) {
      regenerateLiteratureReportBtn.addEventListener("click", function () {
        const val = (literatureSelect && literatureSelect.value) || currentActiveLiterature || "";
        vscode.postMessage({ type: "literatureGenerateReport", fileName: val });
      });
    }

    function doLiteratureSearch() {
      if (!literatureSearchInput) return;
      const q = (literatureSearchInput.value || "").trim();
      if (!q) return;
      const val = literatureSelect ? literatureSelect.value : "";
      vscode.postMessage({ type: "literatureSearch", query: q, limit: 50, fileName: val });
    }

    if (literatureSearchBtn) {
      literatureSearchBtn.addEventListener("click", doLiteratureSearch);
    }
    if (literatureSearchInput) {
      literatureSearchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") doLiteratureSearch();
      });
    }

    if (pickFolderBtn) {
      pickFolderBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "literaturePickFolder" });
      });
    }

    if (clearQueueBtn) {
      clearQueueBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "literatureClearQueue" });
      });
    }

    if (startIngestBtn) {
      startIngestBtn.addEventListener("click", function () {
        const val = literatureSelect ? literatureSelect.value : "";
        vscode.postMessage({ type: "literatureStartIngest", fileName: val });
      });
    }

    if (abortIngestBtn) {
      abortIngestBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "literatureAbortIngest" });
      });
    }

    function renderLiteratureState(state) {
      if (!state) return;

      const activeDb = state.activeLiterature || state.activeCorpus || (state.config && (state.config.activeLiterature || state.config.activeCorpus)) || "";
      const useInSynthesis = !!(state.useInSynthesis !== undefined ? state.useInSynthesis : (state.config && state.config.useInSynthesis));
      const isIngesting = !!(state.isIngesting !== undefined ? state.isIngesting : state.busy === "ingesting");

      if (literatureSelect) {
        let optionsHtml = '<option value="">(No database selected)</option>';
        const dbs = state.literature || state.corpora;
        if (Array.isArray(dbs)) {
          for (const c of dbs) {
            const isSel = c.fileName === activeDb ? " selected" : "";
            optionsHtml += '<option value="' + escapeAttr(c.fileName) + '"' + isSel + '>' + escapeHtml(c.fileName) + '</option>';
          }
        }
        literatureSelect.innerHTML = optionsHtml;
        literatureSelect.value = activeDb;
      }

      if (literatureActiveBadge) {
        if (activeDb) {
          literatureActiveBadge.textContent = "ACTIVE";
          literatureActiveBadge.className = "badge badge-completed";
        } else {
          literatureActiveBadge.textContent = "NO DATABASE";
          literatureActiveBadge.className = "badge badge-idle";
        }
      }

      if (literatureSynthesisToggle) {
        literatureSynthesisToggle.checked = useInSynthesis;
      }

      if (literatureIndicator) {
        literatureIndicator.className = (activeDb && useInSynthesis) ? "tab-indicator active" : "tab-indicator";
      }

      if (literatureQueueList) {
        const queue = state.queue || [];
        if (ingestQueueBadge) {
          ingestQueueBadge.textContent = queue.length + " FILE" + (queue.length === 1 ? "" : "S");
        }
        if (queue.length === 0) {
          literatureQueueList.innerHTML = '<div style="color:var(--muted); font-size:10px; text-align:center; padding:12px;">No documents in queue.<br>Select a folder containing PDFs or supplementary tables (.xlsx/.csv).</div>';
        } else {
          let qHtml = "";
          for (const item of queue) {
            let badgeClass = "badge-idle";
            if (item.stage === "indexed") badgeClass = "badge-indexed";
            else if (item.stage === "failed") badgeClass = "badge-error";
            else if (item.stage === "skipped") badgeClass = "badge-skipped";
            else if (item.stage === "parsing_pdf") badgeClass = "badge-parsing_pdf";
            else if (item.stage === "llm_extraction") badgeClass = "badge-llm_extraction";
            else if (item.stage === "normalization") badgeClass = "badge-normalization";

            qHtml += '<div class="queue-item">' +
              '<div class="queue-item-left">' +
                '<div class="queue-item-title" title="' + escapeAttr(item.absPath) + '">' + escapeHtml(item.fileName) + '</div>' +
                '<div style="font-size:9px; color:var(--muted);">' +
                  (item.pageCount ? item.pageCount + ' pages \u2022 ' : '') +
                  (item.message ? escapeHtml(item.message) : '') +
                '</div>' +
              '</div>' +
              '<span class="badge ' + badgeClass + '">' + escapeHtml(item.stage.toUpperCase()) + '</span>' +
            '</div>';
          }
          literatureQueueList.innerHTML = qHtml;
        }
      }

      currentActiveLiterature = activeDb;

      if (isIngesting) {
        if (startIngestBtn) {
          startIngestBtn.disabled = true;
          startIngestBtn.style.opacity = "0.5";
        }
        if (abortIngestBtn) abortIngestBtn.style.display = "inline-flex";
      } else {
        if (startIngestBtn) {
          startIngestBtn.disabled = false;
          startIngestBtn.style.opacity = "1";
        }
        if (abortIngestBtn) abortIngestBtn.style.display = "none";
      }

      const hasStats = state.stats && (state.stats.study_count !== undefined || state.stats.studies !== undefined);
      if (activeDb && !hasStats) {
        vscode.postMessage({ type: "literatureStats", fileName: activeDb });
      } else if (state.stats) {
        renderLiteratureStats(state.stats);
      } else if (!activeDb) {
        renderLiteratureStats({ study_count: 0, context_count: 0, assertion_count: 0, unique_symbols: 0, organism_count: 0, perturbation_count: 0 });
      }
    }
    const renderCorpusState = renderLiteratureState;

    function renderLiteratureStats(stats) {
      if (!stats) return;
      const studies = stats.study_count ?? stats.studies ?? 0;
      const contexts = stats.context_count ?? stats.contexts ?? 0;
      const assertions = stats.assertion_count ?? stats.assertions ?? 0;
      const symbols = stats.unique_symbols ?? stats.symbols ?? 0;
      const organisms = stats.organism_count ?? stats.organisms ?? 0;
      const perturbations = stats.perturbation_count ?? stats.perturbations ?? 0;

      if (metricStudies) metricStudies.textContent = String(studies);
      if (metricContexts) metricContexts.textContent = String(contexts);
      if (metricAssertions) metricAssertions.textContent = String(assertions);
      if (metricSymbols) metricSymbols.textContent = String(symbols);
      if (metricOrganisms) metricOrganisms.textContent = String(organisms);
      if (metricPerturbations) metricPerturbations.textContent = String(perturbations);
    }
    const renderCorpusStats = renderLiteratureStats;

    function renderLiteratureSearchResults(res) {
      if (!literatureSearchResults) return;
      if (!res || !res.ok) {
        literatureSearchResults.innerHTML = '<div style="color:var(--error); padding:6px;">Search failed: ' + escapeHtml(res?.error || "Unknown error") + '</div>';
        return;
      }
      const data = res.data || res;
      const rows = res.results || res.rows || data.results || data.rows || [];
      const query = res.query || data.query || "";
      if (rows.length === 0) {
        literatureSearchResults.innerHTML = '<div style="color:var(--muted); padding:8px; text-align:center;">No matching assertions found for "' + escapeHtml(query) + '"</div>';
        return;
      }

      let html = '<div style="margin-bottom:4px; font-weight:600; color:var(--muted); font-size:9.5px;">Found ' + rows.length + ' assertion(s):</div>';
      for (const r of rows) {
        const symbol = r.canonical_human_symbol || r.raw_entity_name || "Unknown";
        const rel = r.relationship_type || "";
        const mod = r.functional_module ? ' \u2022 ' + escapeHtml(r.functional_module) : "";
        const ctx = (r.model_name ? escapeHtml(r.model_name) : "") + (r.perturbation_target ? ' (' + escapeHtml(r.perturbation_target) + ')' : "");
        const quote = r.evidence_quote ? '<div style="font-style:italic; color:var(--muted); font-size:9.5px; margin-top:2px;">"' + escapeHtml(r.evidence_quote) + '"</div>' : "";
        const study = r.title ? '<div style="color:var(--primary); font-size:9px; margin-top:2px;">Ref: ' + escapeHtml(r.title) + (r.year ? ' (' + r.year + ')' : '') + '</div>' : "";

        html += '<div style="border-bottom:1px solid var(--border); padding:5px 0;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline;">' +
            '<span style="font-weight:700; color:var(--fg);">' + escapeHtml(symbol) + '</span>' +
            '<span class="badge badge-idle" style="font-size:8px;">' + escapeHtml(rel) + '</span>' +
          '</div>' +
          '<div style="color:var(--fg); font-size:10px;">' + ctx + mod + '</div>' +
          quote +
          study +
        '</div>';
      }
      literatureSearchResults.innerHTML = html;
    }
    const renderCorpusSearchResults = renderLiteratureSearchResults;

    function escapeHtml(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function padTimer(str) {
      return String(str || "").padStart(7, " ");
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
                  durEl.textContent = padTimer(sec + "s");
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

        const litCfg = state.literature || state.knowledgeCorpus;
        const ind = literatureIndicator || corpusIndicator;
        if (ind && litCfg) {
          const act = litCfg.activeLiterature || litCfg.activeCorpus;
          ind.className = (act && litCfg.useInSynthesis) ? "tab-indicator active" : "tab-indicator";
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

        if (loadingPipelineContainer) {
          loadingPipelineContainer.style.display = "none";
        }

        const phaseCount = state.phases ? state.phases.length : 0;
        const analysisFolder = state.folders ? state.folders.find(function (f) { return f.name === "analysis"; }) : null;
        const isMissingOrEmpty = state.isAnalysisMissingOrEmpty !== undefined
          ? state.isAnalysisMissingOrEmpty
          : (!wsPath || !analysisFolder || !analysisFolder.exists || !analysisFolder.itemCount || analysisFolder.itemCount === 0 || phaseCount === 0);

        if (!wsPath) {
          if (noFolderContainer) noFolderContainer.style.display = "block";
          if (initPipelineSection) initPipelineSection.style.display = "none";
          if (activePipelineDashboard) activePipelineDashboard.style.display = "none";
          syncRunTicker(false);
        } else if (isMissingOrEmpty) {
          if (noFolderContainer) noFolderContainer.style.display = "none";
          if (initPipelineSection) initPipelineSection.style.display = "block";
          if (activePipelineDashboard) activePipelineDashboard.style.display = "none";

          // Ensure init button is reset to default state if returning from an operation
          const initBtn = document.getElementById("initWorkspaceBtn");
          if (initBtn) {
            initBtn.removeAttribute("disabled");
            initBtn.innerHTML = '<span>' + (ICONS["sparkles"] || "") + '</span> Initialize Working Directory';
          }
          syncRunTicker(false);
        } else {
          if (noFolderContainer) noFolderContainer.style.display = "none";
          if (initPipelineSection) initPipelineSection.style.display = "none";
          if (activePipelineDashboard) activePipelineDashboard.style.display = "flex";

          if (startPipelineBtn) startPipelineBtn.style.display = anyRunning ? "none" : "block";
          if (stopBtn) stopBtn.style.display = anyRunning ? "block" : "none";
          if (phaseCountLabel) phaseCountLabel.textContent = phaseCount + " Task" + (phaseCount === 1 ? "" : "s");

          // Render Dynamic Analysis Tasks (Tab 1)
          if (phaseContainer) {
            let phaseHtml = "";
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
                cardClass += " task-card-failed";
              } else if (state.isFullPipelineRunning && anyRunning && p.enabled !== false && runningIndex !== -1 && i > runningIndex) {
                displayStatus = "QUEUED";
                badgeClass = "badge badge-queued";
                durationText = "wait";
              } else if (p.durationSeconds !== undefined && p.durationSeconds !== null && p.durationSeconds > 0) {
                durationText = p.durationSeconds + "sec";
              }
              durationText = padTimer(durationText);

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
                taskName = "00_INSTALL";
              }

              const safeTaskName = escapeHtml(taskName);
              const safeFileName = escapeHtml(rawFileName);
              const runDisabled = anyRunning ? "disabled" : "";
              const runBtnTitle = anyRunning ? "Pipeline is currently executing" : ("Run " + safeTaskName);
              const startTimeAttr = (rawStatus === "running" && p.startTime) ? (' data-start-time="' + escapeHtml(p.startTime) + '"') : '';

              let failInsightHtml = "";
              if (rawStatus === "failed" && (p.error || p.summary)) {
                const errorText = String(p.error || p.summary || "").trim();
                const lines = errorText.split(String.fromCharCode(10)).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
                const firstLine = lines[0] || "Phase failed or halted.";
                const remainingLines = lines.slice(1).join(" ");
                const displayMsg = remainingLines ? (firstLine + " \u2014 " + remainingLines) : firstLine;
                const cleanMsg = displayMsg.replace(/^[\u274C\u26A0\uFE0F*# ]+/, "").trim();
                const shortMsg = cleanMsg.length > 250 ? cleanMsg.slice(0, 247) + "..." : cleanMsg;

                const hasExpDoc = /experiment.md/i.test(errorText);
                const hasNotesDoc = /notes.md/i.test(errorText);
                const isConfounding = /confound|Proceed With Potential Batch Confounding|Authorize Unadjusted Exploratory Comparison/i.test(errorText);

                let linksHtml = "";
                if (hasExpDoc) {
                  const searchPrompt = isConfounding ? "Proceed With Potential Batch Confounding" : "REQUIRED";
                  linksHtml += '<button type="button" class="btn-insight-link" data-action="openFile" data-path="docs/experiment.md" data-search="' + searchPrompt + '" title="Open docs/experiment.md and jump directly to relevant section">Edit docs/experiment.md \u2197</button>';
                }
                if (isConfounding) {
                  linksHtml += '<button type="button" class="btn-insight-action-primary" data-action="authorizeConfoundingAndRerun" data-phase-id="' + escapeHtml(p.id) + '" title="Set Proceed With Potential Batch Confounding to TRUE in docs/experiment.md and automatically rerun this phase">\u26A1 Authorize &amp; Rerun</button>';
                }
                if (hasNotesDoc) {
                  linksHtml += '<button type="button" class="btn-insight-link" data-action="openFile" data-path="docs/notes.md">View docs/notes.md \u2197</button>';
                }

                failInsightHtml = '<div class="task-insight-box" title="' + escapeHtml(errorText) + '">' +
                  '<div class="task-insight-header">' +
                    '<span class="task-insight-icon">\u26A0\uFE0F</span>' +
                    '<span class="task-insight-title">Action Required</span>' +
                  '</div>' +
                  '<div class="task-insight-body">' + escapeHtml(shortMsg) + '</div>' +
                  (linksHtml ? ('<div class="task-insight-actions">' + linksHtml + '</div>') : '') +
                '</div>';
              }

              let logLinksHtml = "";
              if (rawStatus === "completed" || rawStatus === "failed" || rawStatus === "running") {
                const phaseDir = safeTaskName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                logLinksHtml = '<div class="task-log-links" style="display:flex; gap:8px; margin-top:3px; padding-left:22px; font-size:10px;">' +
                  '<span data-action="openFile" data-path="logs/' + phaseDir + '/chat.md" class="log-link" title="Open phase chat trace in VS Code" style="cursor:pointer; color:var(--vscode-textLink-foreground, #3794ff);">\u{1F4AC} Chat</span>' +
                  '<span style="color:var(--muted); opacity:0.6;">\u2022</span>' +
                  '<span data-action="openFile" data-path="logs/' + phaseDir + '/console.log" class="log-link" title="Open raw console output in VS Code" style="cursor:pointer; color:var(--muted);">\u{1F4DC} Console</span>' +
                '</div>';
              }

              phaseHtml += '<div class="' + cardClass + '"' + startTimeAttr + '>' +
                '<div class="task-main-row">' +
                  '<div class="task-left">' +
                    '<input type="checkbox" ' + checked + ' data-phase-id="' + escapeHtml(p.id) + '" title="Include in pipeline" ' + (anyRunning ? "disabled" : "") + ' />' +
                    '<span class="task-name" data-action="openPhase" data-file="' + safeFileName + '" title="Click to edit ' + safeFileName + ' in VS Code">' + safeTaskName + '</span>' +
                  '</div>' +
                  '<div class="task-right">' +
                    '<button type="button" class="btn-run" data-action="runPhase" data-id="' + escapeHtml(p.id) + '" ' + runDisabled + ' title="' + escapeHtml(runBtnTitle) + '">' + (ICONS["play"] || "") + ' RUN</button>' +
                    '<span class="' + badgeClass + '">' + escapeHtml(displayStatus) + '</span>' +
                    '<span class="task-duration">' + escapeHtml(durationText) + '</span>' +
                  '</div>' +
                '</div>' +
                failInsightHtml +
                logLinksHtml +
              '</div>';
            }
            phaseContainer.innerHTML = phaseHtml;
            syncRunTicker(anyRunning);
          }
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

    function appendLog(text, updateLast) {
      if (terminalLog && text) {
        if (updateLast) {
          const lines = terminalLog.textContent.split("\\n");
          let targetIndex = lines.length - 1;
          while (targetIndex > 0 && lines[targetIndex].trim() === "") {
            targetIndex--;
          }
          if (targetIndex >= 0) {
            lines[targetIndex] = String(text);
            terminalLog.textContent = lines.join("\\n");
          } else {
            terminalLog.textContent = String(text);
          }
        } else {
          terminalLog.textContent += "\\n" + String(text);
        }
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
          appendLog(message.text, message.updateLast);
        } else if (message.type === "literatureState" || message.type === "corpusState") {
          renderLiteratureState(message.state);
        } else if (message.type === "literatureStats" || message.type === "corpusStats") {
          const stats = message.stats || (message.result && (message.result.stats || (message.result.data && (message.result.data.stats || message.result.data.totals))));
          if (stats) {
            renderLiteratureStats(stats);
          }
        } else if (message.type === "literatureSearchResult" || message.type === "corpusSearchResult") {
          renderLiteratureSearchResults(message.result || message);
        } else if (message.type === "literatureProgress" || message.type === "corpusProgress") {
          vscode.postMessage({ type: "literatureGetState" });
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
</html>`}};function Fe(y){console.log("TidyProteomicsAgent extension is now active!");let e=I.window.createOutputChannel("TidyProteomicsAgent");y.subscriptions.push(e);let t=r=>{let a=r?.stack||String(r);typeof a=="string"&&(a.includes("Missing dataLength in event")||a.includes("strict mode functions"))||(e.appendLine(`[UNCAUGHT EXCEPTION] ${a}`),console.error("[TidyProteomicsAgent UNCAUGHT EXCEPTION]",r))},s=r=>{let a=r?.stack||String(r);typeof a=="string"&&(a.includes("Missing dataLength in event")||a.includes("strict mode functions"))||(e.appendLine(`[UNHANDLED REJECTION] ${a}`),console.error("[TidyProteomicsAgent UNHANDLED REJECTION]",r))};process.on("uncaughtException",t),process.on("unhandledRejection",s),y.subscriptions.push({dispose:()=>{process.removeListener("uncaughtException",t),process.removeListener("unhandledRejection",s)}});let i=new Y(y.extensionUri,y);y.subscriptions.push(I.window.registerWebviewViewProvider(Y.viewType,i));let o=[],n=r=>{for(let p of o)try{p.dispose()}catch{}o=[];let a=[];if(r)a.push(I.Uri.file(r));else{let p=I.workspace.workspaceFolders;p&&p.length>0&&a.push(...p)}if(a.length!==0)for(let p of a)try{let l=p.fsPath||p.uri?.fsPath||"";if(!l||!V.existsSync(l))continue;let d=X.join(l,"analysis");if(V.existsSync(d)){let f=I.workspace.createFileSystemWatcher(new I.RelativePattern(I.Uri.file(d),"*.md"));f.onDidCreate(()=>i.refreshPhases().catch(()=>{})),f.onDidChange(()=>i.refreshPhases().catch(()=>{})),f.onDidDelete(()=>i.forceReload().catch(()=>{})),o.push(f)}let c=X.join(l,"agent");if(V.existsSync(c)){let f=I.workspace.createFileSystemWatcher(new I.RelativePattern(I.Uri.file(c),"*.md"));f.onDidCreate(()=>i.refreshPhases().catch(()=>{})),f.onDidChange(()=>i.refreshPhases().catch(()=>{})),f.onDidDelete(()=>i.refreshPhases().catch(()=>{})),o.push(f)}let g=X.join(l,"prompts");if(V.existsSync(g)){let f=I.workspace.createFileSystemWatcher(new I.RelativePattern(I.Uri.file(g),"*.md"));f.onDidCreate(()=>i.refreshPhases().catch(()=>{})),f.onDidChange(()=>i.refreshPhases().catch(()=>{})),f.onDidDelete(()=>i.refreshPhases().catch(()=>{})),o.push(f)}let m=X.join(l,"docs");if(V.existsSync(m)){let f=I.workspace.createFileSystemWatcher(new I.RelativePattern(I.Uri.file(m),"notes.md"));f.onDidCreate(()=>i.forceReload().catch(()=>{})),f.onDidChange(()=>i.forceReload().catch(()=>{})),f.onDidDelete(()=>i.forceReload().catch(()=>{})),o.push(f)}}catch(l){let d=p.fsPath||p.uri?.fsPath||"";console.error("[TidyProteomicsAgent] Failed to initialize file watchers for folder:",d,l)}};i.onFolderChangedCallback=r=>{n(r)},n(),y.subscriptions.push(I.workspace.onDidChangeWorkspaceFolders(()=>{n(),i.onWorkspaceChanged().catch(()=>{})})),y.subscriptions.push({dispose:()=>{for(let r of o)try{r.dispose()}catch{}o=[]}}),y.subscriptions.push(I.commands.registerCommand("tidyproteomicsagent.startPipeline",()=>{i.startPipeline()})),y.subscriptions.push(I.commands.registerCommand("tidyproteomicsagent.runCurrentPhase",()=>{i.runSelectedPhase().catch(r=>{I.window.showErrorMessage(`TidyProteomicsAgent: ${r.message||String(r)}`)})})),y.subscriptions.push(I.commands.registerCommand("tidyproteomicsagent.refreshTasks",()=>{i.forceReload()})),y.subscriptions.push(I.commands.registerCommand("tidyproteomicsagent.resetState",async()=>{await I.window.showWarningMessage("Are you sure you want to reset the pipeline state in docs/notes.md?",{modal:!0},"Yes","Cancel")==="Yes"&&(await i.resetAllState(),I.window.showInformationMessage("TidyProteomicsAgent: Pipeline state reset."))})),y.subscriptions.push(I.commands.registerCommand("tidyproteomicsagent.initWorkspace",async()=>{await i.promptInitWorkspace()}))}function Ue(){}0&&(module.exports={activate,deactivate});
