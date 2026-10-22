"use strict";var Be=Object.create;var ce=Object.defineProperty;var Oe=Object.getOwnPropertyDescriptor;var Ue=Object.getOwnPropertyNames;var je=Object.getPrototypeOf,We=Object.prototype.hasOwnProperty;var He=(v,e)=>{for(var s in e)ce(v,s,{get:e[s],enumerable:!0})},Pe=(v,e,s,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let i of Ue(e))!We.call(v,i)&&i!==s&&ce(v,i,{get:()=>e[i],enumerable:!(t=Oe(e,i))||t.enumerable});return v};var M=(v,e,s)=>(s=v!=null?Be(je(v)):{},Pe(e||!v||!v.__esModule?ce(s,"default",{value:v,enumerable:!0}):s,v)),ze=v=>Pe(ce({},"__esModule",{value:!0}),v);var et={};He(et,{activate:()=>Xe,deactivate:()=>Ze});module.exports=ze(et);var _=M(require("vscode")),re=M(require("path")),ee=M(require("fs"));var h=M(require("vscode")),b=M(require("path")),k=M(require("fs"));var L=M(require("fs/promises")),A=M(require("path"));var _e=M(require("fs/promises")),B=M(require("path"));var I=M(require("fs")),x=M(require("path")),Ee=require("child_process"),te="literature",xe="literature_config.json",X=".duckdb",Ce=x.join("tools","literature"),Se="@@LITERATURE_JSON@@",Ie="@@CORPUS_JSON@@";var qe=new Set([".pdf"]),Ke=new Set([".csv",".tsv",".xlsx",".xls"]),Ge=3,Re=500;function z(v){return x.join(v,te)}function Ae(v){if(!v)return;let e=x.join(v,".vscode","corpora"),s=x.join(v,te);if(I.existsSync(e)&&!I.existsSync(s))try{I.mkdirSync(s,{recursive:!0});let t=I.readdirSync(e);for(let i of t){let o=x.join(e,i);if(i.toLowerCase().endsWith(X))I.copyFileSync(o,x.join(s,i));else if(i==="corpus_config.json")try{let n=I.readFileSync(o,"utf-8"),a=JSON.parse(n),r=a.activeLiterature||a.activeCorpus,p={activeLiterature:r,activeCorpus:r,useInSynthesis:!!a.useInSynthesis,updatedAt:a.updatedAt||new Date().toISOString()};I.writeFileSync(x.join(s,xe),JSON.stringify(p,null,2)+`
`,"utf-8")}catch{}}}catch(t){console.warn("[LiteratureService] Auto-migration from .vscode/corpora failed:",t)}}function J(v){let e={useInSynthesis:!1};if(!v)return e;Ae(v);try{let s=x.join(z(v),xe),t="";if(I.existsSync(s))t=I.readFileSync(s,"utf-8");else{let n=x.join(v,".vscode","corpora","corpus_config.json");if(I.existsSync(n))t=I.readFileSync(n,"utf-8");else return e}let i=JSON.parse(t),o=typeof i.activeLiterature=="string"&&i.activeLiterature||typeof i.activeCorpus=="string"&&i.activeCorpus||void 0;return{activeLiterature:o,activeCorpus:o,useInSynthesis:!!i.useInSynthesis,updatedAt:typeof i.updatedAt=="string"?i.updatedAt:void 0}}catch{return e}}function Le(v){let e=J(v),s=e.activeLiterature||e.activeCorpus;if(!e.useInSynthesis||!s)return;let t=z(v),i=x.join(t,s);if(!I.existsSync(i)){let o=x.join(v,".vscode","corpora",s);if(I.existsSync(o))i=o;else return}return{relPath:x.join(te,s).replace(/\\/g,"/"),absPath:i}}function Ve(v){return String(v||"").trim().replace(/\.duckdb$/i,"").toLowerCase().replace(/[^a-z0-9_-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,64)}var le=class{constructor(e,s,t=()=>{}){this.workspaceRoot=e;this.extensionPath=s;this.getRscriptOverride=t}queue=[];ingestFolder;writeChain=Promise.resolve();cachedRscript;cachedStats=new Map;setWorkspaceRoot(e){e!==this.workspaceRoot&&(this.workspaceRoot=e||"",this.queue=[],this.ingestFolder=void 0)}getWorkspaceRoot(){return this.workspaceRoot}requireRoot(){if(!this.workspaceRoot)throw new Error("No active workspace directory. Open or choose an analysis folder first.");return this.workspaceRoot}listDatabases(){if(!this.workspaceRoot)return[];Ae(this.workspaceRoot);let e=z(this.workspaceRoot);if(!I.existsSync(e))return[];let s=[];for(let t of I.readdirSync(e)){if(!t.toLowerCase().endsWith(X))continue;let i=x.join(e,t);try{let o=I.statSync(i);if(!o.isFile())continue;s.push({name:t.slice(0,-X.length),fileName:t,relPath:x.join(te,t).replace(/\\/g,"/"),absPath:i,sizeBytes:o.size,modified:o.mtime.toISOString()})}catch{}}return s.sort((t,i)=>t.name.localeCompare(i.name))}listCorpora(){return this.listDatabases()}getConfig(){return J(this.workspaceRoot)}writeConfig(e){let s=z(this.requireRoot());I.mkdirSync(s,{recursive:!0});let t=e.activeLiterature||e.activeCorpus,i={...e,activeLiterature:t,activeCorpus:t,updatedAt:new Date().toISOString()};I.writeFileSync(x.join(s,xe),JSON.stringify(i,null,2)+`
`,"utf-8")}getViewState(e){let s=this.listDatabases(),t=this.getConfig(),i=t.activeLiterature||t.activeCorpus;i&&!s.some(r=>r.fileName===i)&&(t={...t,activeLiterature:void 0,activeCorpus:void 0});let o=s.find(r=>r.fileName===i),n=this.workspaceRoot?z(this.workspaceRoot):"",a=i?this.cachedStats.get(x.basename(i)):void 0;return{workspaceRoot:this.workspaceRoot,literatureDir:n,corporaDir:n,databases:s,literature:s,corpora:s,config:t,activeLiterature:i,activeCorpus:i,useInSynthesis:!!t.useInSynthesis,activeLiteratureInfo:o,activeCorpusInfo:o,ingestFolder:this.ingestFolder,queue:[...this.queue],ingestionAvailable:!0,busy:e,isIngesting:e==="ingesting",stats:a}}async createDatabase(e){let s=this.requireRoot(),t=Ve(e);if(!t)throw new Error("Literature database name must contain at least one letter or number.");let i=`${t}${X}`,o=z(s);I.mkdirSync(o,{recursive:!0});let n=x.join(o,i);if(I.existsSync(n))throw new Error(`A literature database named '${i}' already exists.`);let a=await this.runCli("init",[n,e.trim()||t],!0);if(!a.ok)throw new Error(a.error||"Failed to initialize literature database.");this.cachedStats.set(i,{study_count:0,context_count:0,assertion_count:0,unique_symbols:0,organism_count:0,perturbation_count:0,studies:0,contexts:0,assertions:0,symbols:0,organisms:0,perturbations:0}),this.syncWorkspaceScripts();let r=this.getConfig();this.writeConfig({...r,activeLiterature:i,activeCorpus:i});let p=this.listDatabases().find(l=>l.fileName===i);if(!p)throw new Error("Literature database was initialized but could not be found on disk.");return p}async createCorpus(e){return this.createDatabase(e)}setActiveLiterature(e){let s=this.requireRoot();if(e){let o=x.join(z(s),x.basename(e));if(!I.existsSync(o))throw new Error(`Literature database '${e}' not found in ${te}.`)}let t=this.getConfig(),i=e?x.basename(e):void 0;this.writeConfig({...t,activeLiterature:i,activeCorpus:i}),this.syncWorkspaceScripts()}setActiveCorpus(e){this.setActiveLiterature(e)}setUseInSynthesis(e){let s=this.getConfig();this.writeConfig({...s,useInSynthesis:!!e}),e&&this.syncWorkspaceScripts()}async ensureSchema(e){let s=this.resolveLiteraturePath(e),t=await this.runCli("init",[s],!0);if(!t.ok)throw new Error(t.error||"Failed to migrate literature schema.")}async getStats(e){let s=this.getConfig(),t=e||s.activeLiterature||s.activeCorpus;if(!t)return{ok:!1,error:"No active literature database selected."};let i=await this.runCli("stats",[this.resolveLiteraturePath(t)],!1);if(i.ok&&i.data){let o=i.data.totals||i.data.stats||i.data,n={study_count:Number(o.study_count??o.studies??0),context_count:Number(o.context_count??o.contexts??0),assertion_count:Number(o.assertion_count??o.assertions??0),unique_symbols:Number(o.unique_symbols??o.symbols??0),organism_count:Number(o.organism_count??o.organisms??0),perturbation_count:Number(o.perturbation_count??o.perturbations??0),studies:Number(o.studies??o.study_count??0),contexts:Number(o.contexts??o.context_count??0),assertions:Number(o.assertions??o.assertion_count??0),symbols:Number(o.symbols??o.unique_symbols??0),organisms:Number(o.organisms??o.organism_count??0),perturbations:Number(o.perturbations??o.perturbation_count??0)};return this.cachedStats.set(x.basename(t),n),{...i,stats:n,data:{...i.data,stats:n,totals:{...i.data.totals||{},...n}}}}return i}async search(e,s=50,t){let i=this.getConfig(),o=t||i.activeLiterature||i.activeCorpus;if(!o)return{ok:!1,error:"No active literature database selected."};let n=String(e||"").trim();if(!n)return{ok:!1,error:"Enter a protein symbol, alias, functional module, or perturbation."};let a=await this.runCli("search",[this.resolveLiteraturePath(o),n,String(s)],!1);if(a.ok&&a.data){let r=a.data.rows||a.data.results||[];return{...a,results:r,rows:r,query:n,data:{...a.data,rows:r,results:r}}}return a}async generateReport(e,s="docs/literature_database.md"){let t=this.getConfig(),i=e||t.activeLiterature||t.activeCorpus;if(!i)return{ok:!1,error:"No active literature database selected."};let o=this.resolveLiteraturePath(i),n=x.isAbsolute(s)?s:x.join(this.requireRoot(),s);return await this.runCli("report",[o,n],!0)}resolveLiteraturePath(e){let s=x.basename(e),t=s.toLowerCase().endsWith(X)?s:`${s}${X}`,i=x.join(z(this.requireRoot()),t);if(I.existsSync(i))return i;if(this.workspaceRoot){let o=x.join(this.workspaceRoot,".vscode","corpora",t);if(I.existsSync(o))return o}return i}scanIngestFolder(e){if(!e||!I.existsSync(e)||!I.statSync(e).isDirectory())throw new Error(`Folder not found: ${e}`);let s=[],t=(i,o)=>{if(o>Ge||s.length>=Re)return;let n=[];try{n=I.readdirSync(i,{withFileTypes:!0})}catch{return}n.sort((a,r)=>a.name.localeCompare(r.name));for(let a of n){if(a.name.startsWith(".")||a.name.startsWith("~$"))continue;let r=x.join(i,a.name);if(a.isDirectory()){t(r,o+1);continue}let p=x.extname(a.name).toLowerCase(),l=qe.has(p)?"pdf":Ke.has(p)?"table":void 0;if(!l)continue;let d=0;try{d=I.statSync(r).size}catch{}if(s.push({id:`q${s.length+1}`,fileName:a.name,absPath:r,relPath:x.relative(e,r).replace(/\\/g,"/"),kind:l,sizeBytes:d,stage:"queued"}),s.length>=Re)return}};return t(e,0),this.ingestFolder=e,this.queue=s,[...s]}clearQueue(){this.queue=[],this.ingestFolder=void 0}updateQueueItem(e,s){let t=this.queue.find(i=>i.id===e);t&&Object.assign(t,s)}syncWorkspaceScripts(){if(!this.workspaceRoot)return;let e=this.findTemplateScriptsDir();if(!e)return;let s=x.join(this.workspaceRoot,Ce);try{I.mkdirSync(s,{recursive:!0});for(let t of I.readdirSync(e))t.endsWith(".R")&&I.copyFileSync(x.join(e,t),x.join(s,t))}catch(t){console.warn("[LiteratureService] Could not sync literature scripts into workspace:",t)}}findTemplateScriptsDir(){return[x.join(this.extensionPath,"templates","shared","tools","literature"),x.join(this.extensionPath,"extension","templates","shared","tools","literature"),x.join(__dirname,"..","templates","shared","tools","literature"),x.join(__dirname,"..","..","templates","shared","tools","literature"),x.join(this.extensionPath,"templates","shared","tools","corpus"),x.join(this.extensionPath,"extension","templates","shared","tools","corpus"),x.join(__dirname,"..","templates","shared","tools","corpus"),x.join(__dirname,"..","..","templates","shared","tools","corpus")].find(s=>I.existsSync(x.join(s,"literature_cli.R"))||I.existsSync(x.join(s,"corpus_cli.R")))}findCliScript(){let e=this.findTemplateScriptsDir();if(e){let s=x.join(e,"literature_cli.R");if(I.existsSync(s))return s;let t=x.join(e,"corpus_cli.R");if(I.existsSync(t))return t}if(this.workspaceRoot){let s=x.join(this.workspaceRoot,Ce,"literature_cli.R");if(I.existsSync(s))return s;let t=x.join(this.workspaceRoot,"tools","corpus","corpus_cli.R");if(I.existsSync(t))return t}throw new Error("literature_cli.R not found in extension templates or workspace tools/literature/.")}resolveRscript(){let e=(this.getRscriptOverride()||"").trim();if(e)return e;if(this.cachedRscript)return this.cachedRscript;let s=["/usr/local/bin/Rscript","/opt/homebrew/bin/Rscript","/Library/Frameworks/R.framework/Resources/bin/Rscript","/usr/bin/Rscript"],t=(process.env.PATH||"").split(x.delimiter).filter(Boolean),i=process.platform==="win32"?"Rscript.exe":"Rscript";for(let n of t)s.unshift(x.join(n,i));let o=s.find(n=>{try{return I.statSync(n).isFile()}catch{return!1}});return this.cachedRscript=o||"Rscript",this.cachedRscript}runCli(e,s,t=!0,i=12e4){let o=()=>this.execR(this.findCliScript(),[e,...s],i),n=this.writeChain.then(o,o);return this.writeChain=n.catch(()=>{}),n}execR(e,s,t){return new Promise(i=>{let o;try{o=this.resolveRscript()}catch(n){i({ok:!1,error:n.message});return}(0,Ee.execFile)(o,[e,...s],{cwd:this.workspaceRoot||void 0,timeout:t,maxBuffer:20*1024*1024},(n,a,r)=>{let l=String(a||"").split(/\r?\n/).find(f=>f.startsWith(Se)||f.startsWith(Ie));if(l)try{let f=l.startsWith(Se)?Se:Ie,m=JSON.parse(l.slice(f.length));m&&m.ok?i({ok:!0,data:m,stderr:String(r||"")}):i({ok:!1,error:m?.error||"Unknown R error",stderr:String(r||"")});return}catch(f){i({ok:!1,error:`Could not parse R output: ${f.message}`,stderr:String(r||"")});return}let d=n?.code,c;d==="ENOENT"?c=`Rscript not found ('${o}'). Install R or set 'tidyproteomicsagent.rscriptPath' in Settings.`:n?.killed?c=`R process timed out after ${Math.round(t/1e3)}s.`:c=String(r||n?.message||"").trim().split(/\r?\n/).slice(-6).join(`
`)||"R process exited without output.",i({ok:!1,error:c,stderr:String(r||"")})})})}};var de=class{constructor(e,s="agent",t="analysis"){this.workspaceRoot=e;this.promptsDir=s;this.analysisDir=t}setWorkspaceRoot(e){this.workspaceRoot=e||""}async readFileSafe(e){try{if(!this.workspaceRoot&&!B.isAbsolute(e))return"";let s=B.isAbsolute(e)?e:B.join(this.workspaceRoot,e);return await _e.readFile(s,"utf-8")}catch{return""}}getSkillsForPhase(e,s){let t=s.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);if(t){let n=t[1].match(/skills:\s*[\r\n]+((?:\s*-\s*[\w_]+[\r\n]+)+)/);if(n)return n[1].split(/[\r\n]+/).map(a=>a.replace(/^\s*-\s*/,"").trim()).filter(Boolean)}let i=B.basename(e).toUpperCase();return i.includes("INSTALL")||i.includes("SETUP")&&!i.includes("DATA")?["TIDYPROTEOMICS_CORE"]:i.includes("INSPECT")||i.includes("DATA_QUALITY")?["TIDYPROTEOMICS_CORE","TIDYPROTEOMICS_IMPORT_INSPECT"]:i.includes("NORMALIZE")?["TIDYPROTEOMICS_CORE","TIDYPROTEOMICS_NORMALIZE_IMPUTE"]:i.includes("IMPUTE")?["TIDYPROTEOMICS_CORE","TIDYPROTEOMICS_NORMALIZE_IMPUTE"]:i.includes("EXPRESSION")?["TIDYPROTEOMICS_CORE","TIDYPROTEOMICS_EXPRESSION"]:i.includes("ENRICHMENT")?["TIDYPROTEOMICS_CORE","TIDYPROTEOMICS_ENRICHMENT"]:i.includes("OBSERVATION")||i.includes("KNOWLEDGE")||i.includes("WEBSEARCH")||i.includes("LITERATURE")?["TIDYPROTEOMICS_CORE","TIDYPROTEOMICS_EXTRACT_QUERY"]:i.includes("SYNTHESIS")?["TIDYPROTEOMICS_CORE"]:["TIDYPROTEOMICS_CORE"]}async buildPhaseContext(e){let s=this.promptsDir,t=await this.readFileSafe(B.join(s,"PROTOCOL.md"));if(!t&&s==="agent"){let u=await this.readFileSafe(B.join("prompts","PROTOCOL.md"));u&&(s="prompts",t=u)}if(!t){let u=await this.readFileSafe(".clinerules"),E=await this.readFileSafe(B.join(s,"INSTRUCT.md"));t=`${u}

${E}`.trim()}let i=e;!e.includes("/")&&!e.includes("\\")&&(i=B.join(this.analysisDir,e));let o=await this.readFileSafe(i),n=this.getSkillsForPhase(e,o),a=[],r=[];for(let u of n){let E=u.endsWith(".md")?u:`${u}.md`,P=await this.readFileSafe(B.join(s,E));P&&(a.push(B.join(s,E)),r.push(P))}if(r.length===0){let u=await this.readFileSafe(B.join(s,"TIDYPROTEOMICS_CORE.md"));u&&(a.push(B.join(s,"TIDYPROTEOMICS_CORE.md")),r.push(u))}let p=r.join(`

---

`).trim(),l=await this.readFileSafe(B.join("docs","experiment.md")),d=await this.readFileSafe(B.join(s,"VARIABLES.md"));d||(d=l||"No dataset parameters provided. See docs/experiment.md.");let c=await this.readFileSafe(B.join(s,"BIOLOGY.md")),f=c?`

# CURATED DOMAIN BIOLOGICAL CONTEXT
${c}`:"",m=`
# AUTONOMOUS ANALYSIS PROTOCOL & QUALITY GATES
${t}

# INPUT DATASET PARAMETERS & EXPERIMENT SPECIFICATION
${d}
${f}

# DOMAIN SKILL SPECIFICATION & API CONVENTIONS
${p}
`.trim(),g=await this.readFileSafe(B.join("docs","notes.md")),w=await this.readFileSafe(B.join("docs","llm.md")),y=`
## CURRENT RUNTIME STATE (Shared Memory)
### docs/notes.md:
${g||"No prior execution notes found. Initialize if this is Phase 0 or Phase 1."}

### docs/llm.md (ACTIVE MODEL & AGENT SPECIFICATION - READ ONLY):
${w||"No active model summary found."}

### docs/experiment.md (USER EXPERIMENT & DATASET SPECIFICATION):
${l||"No user experiment design provided. Note: Sections 1 & 2 are strictly user-maintained. The agent may append or update Section 3 to scaffold sample grouping, renaming, and contrast suggestions for user confirmation."}
${this.buildLiteratureSection()}
`.trim(),S=m,R=B.basename(e).replace(/\.md$/,"").toUpperCase(),F=`
${y}

---

## ACTIVE PHASE DIRECTIVE (${e})
${o}

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
- Once all checkpoints for this phase are satisfied and verified, invoke complete_phase(phaseName = "${R}", summary = "...").
- If a mandatory pre-flight gate, configuration prerequisite, or checkpoint fails and requires user intervention (such as unconfigured placeholders or ambiguous/confounded contrasts in docs/experiment.md), scaffold concrete suggestions directly into Section 3 of docs/experiment.md, then immediately invoke fail_phase(phaseName = "${R}", reason = "...", actionableInsights = "...") to halt execution and present actionable insights to the user.
`.trim();return{systemPrompt:S,phasePrompt:F,blackboardState:y,staticPrefixForCache:m,loadedSkillFiles:a}}buildLiteratureSection(){if(!this.workspaceRoot)return"";let e=J(this.workspaceRoot);if(!(e.activeLiterature||e.activeCorpus)&&!e.useInSynthesis)return"";let t=Le(this.workspaceRoot);return t?`
### ACTIVE LITERATURE DATABASE (DuckDB - READ ONLY):
- Status: ENABLED for literature corroboration and synthesis.
- Database file: \`${t.relPath}\`
- Schema: studies(study_id, title, year, core_thesis) -> experimental_contexts(context_id, organism, model_name, perturbation_type, perturbation_target, assay_modality) -> molecular_assertions(raw_entity_name, canonical_human_symbol, relationship_type, functional_module, quantitative_note, evidence_quote). Denormalized view: v_assertions_full.
- Inspect: \`Rscript tools/literature/literature_cli.R stats ${t.relPath}\`
- Lookup: \`Rscript tools/literature/literature_cli.R search ${t.relPath} <SYMBOL_OR_MODULE> [limit]\`
- Query Skill: \`Rscript tools/literature/query_literature.R ${t.relPath} "<seed_symbols>" "<pathway_terms>"\`
- Policy: Prefer literature database evidence (cite study_id + verbatim evidence_quote) over generic web search. Open the database read-only; never modify it during analysis phases.
`:`
### ACTIVE LITERATURE DATABASE (DuckDB):
- Status: DISABLED for synthesis (toggle off or no database selected in the Literature tab).
- Use the standard literature corroboration strategy described in the phase directive.
`}};var pe=class{constructor(e,s,t,i,o,n,a,r){this.phaseName=e;this.phaseTitle=s;this.client=t;this.tools=i;this.context=o;this.onProgress=n;this.chatLogger=a;this.isCancelled=r}messages=[];totalUsage={promptTokens:0,completionTokens:0,totalTokens:0,cachedPromptTokens:0};getTotalUsage(){return{...this.totalUsage}}async run(e=25){let s=Date.now();if(this.messages.push({role:"user",content:this.context.phasePrompt}),this.chatLogger){this.chatLogger.setPhase(this.phaseName);let r=this.client.getConfig();await this.chatLogger.logPhaseStart({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,model:r.model,provider:r.provider,systemPromptFiles:["agent/PROTOCOL.md","docs/experiment.md",...this.context.loadedSkillFiles&&this.context.loadedSkillFiles.length>0?this.context.loadedSkillFiles:["agent/TIDYPROTEOMICS_CORE.md"]],inputPromptFiles:[this.phaseName.includes("/")?this.phaseName:`analysis/${this.phaseName}`,"docs/notes.md","docs/llm.md","docs/experiment.md"]})}let t=0,i="",o=0;for(;t<e;){if(this.isCancelled&&this.isCancelled()){let c="Execution stopped by user.";if(this.chatLogger){let f=Math.round((Date.now()-s)/1e3);await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:c,durationSeconds:f,tokensUsed:this.totalUsage,turnCount:t})}return{success:!1,summary:c,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:t}}t++,this.onProgress({type:"thought",data:`Starting Turn ${t}/${e}...`});let r,p=2,l=0,d=null;for(;l<=p&&(l++,!(this.isCancelled&&this.isCancelled()));)try{r=await this.client.chat({system:this.context.systemPrompt,messages:this.messages,tools:this.tools.getDefinitions(),onToken:c=>{this.onProgress({type:"text",data:c})}}),d=null;break}catch(c){if(d=c,(c.name==="TimeoutError"||c.name==="AbortError"||/timeout|aborted|ETIMEDOUT|ECONNRESET/i.test(c.message||""))&&l<=p&&(!this.isCancelled||!this.isCancelled())){let m=l*3e3;this.onProgress({type:"thought",data:`Turn ${t} timed out on attempt ${l}/${p+1} (${c.message}). Retrying in ${m/1e3}s...`}),await new Promise(g=>setTimeout(g,m));continue}break}if(!r){let c=d?`LLM API Error during turn ${t}: ${d.message}`:"Execution stopped by user.";if(this.chatLogger){let f=Math.round((Date.now()-s)/1e3);await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:c,durationSeconds:f,tokensUsed:this.totalUsage,turnCount:t})}return{success:!1,summary:c,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:t}}if(this.totalUsage.promptTokens+=r.usage.promptTokens,this.totalUsage.completionTokens+=r.usage.completionTokens,this.totalUsage.totalTokens+=r.usage.totalTokens,this.totalUsage.cachedPromptTokens=(this.totalUsage.cachedPromptTokens||0)+(r.usage.cachedPromptTokens||0),this.onProgress({type:"tokens",data:{turn:t,turnUsage:r.usage,totalUsage:{...this.totalUsage}}}),this.messages.push({role:"assistant",content:r.content,tool_calls:r.tool_calls}),this.chatLogger&&await this.chatLogger.logAssistantResponse(t,r.content,r.tool_calls,r.usage),r.truncationDetected){let c=`Output limit reached (finish_reason: "${r.finishReason||"length"}", tokens: ${r.usage.completionTokens}). Generation was truncated.`;this.onProgress({type:"thought",data:c}),this.chatLogger&&await this.chatLogger.logTruncationWarning(t,r.finishReason||"length",r.usage.completionTokens)}if(r.tool_calls&&r.tool_calls.length>0){o=0;for(let c of r.tool_calls){this.onProgress({type:"tool_start",data:{name:c.name,args:c.args}});let f=await this.tools.execute(c.name,c.args);this.onProgress({type:"tool_end",data:{name:c.name,result:f.content,isError:f.isError}});let m=f.content;if(m&&m.length>24e3){let w=m.slice(0,12e3),y=m.slice(-1e4),S=m.length-22e3;m=`${w}

... [Output truncated: ${S.toLocaleString()} characters omitted to preserve context economy. See complete output in workspace/logs/ or inspect with 'read_file'] ...

${y}`}if(this.messages.push({role:"tool",tool_call_id:c.id,tool_name:c.name,content:m}),this.chatLogger&&await this.chatLogger.logToolResult(c.name,c.id,f.content,f.isError,c.args),c.name==="fail_phase"){let w=c.args.reason||"Phase gate or checkpoint failed",y=c.args.actionableInsights||"",S=y?`[Failed] Pre-flight Gate / Checkpoint: ${w}

Actionable Insights:
${y}`:`[Failed] Pre-flight Gate / Checkpoint: ${w}`,R=Math.round((Date.now()-s)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:S,durationSeconds:R,tokensUsed:this.totalUsage,turnCount:t}),{success:!1,summary:S,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:t}}if(c.name==="complete_phase"){i=c.args.summary||r.content;let w=Math.round((Date.now()-s)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!0,summary:i,durationSeconds:w,tokensUsed:this.totalUsage,turnCount:t}),{success:!0,summary:i,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:t}}}}else if(o++,r.content.includes("PHASE_COMPLETED")||r.content.includes("CHECKPOINT_PASSED")){let c=Math.round((Date.now()-s)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!0,summary:r.content,durationSeconds:c,tokensUsed:this.totalUsage,turnCount:t}),{success:!0,summary:r.content,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:t}}else if(this.isPhaseFailureOrHalt(r.content)){let c=Math.round((Date.now()-s)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:r.content,durationSeconds:c,tokensUsed:this.totalUsage,turnCount:t}),{success:!1,summary:r.content,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:t}}else if(o>=2){let c=`Execution halted: Agent stopped calling tools and provided instructions to user:

${r.content}`,f=Math.round((Date.now()-s)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:c,durationSeconds:f,tokensUsed:this.totalUsage,turnCount:t}),{success:!1,summary:c,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:t}}else r.truncationDetected?this.messages.push({role:"user",content:`[System Notice]: Your response reached the maximum output token limit (finish_reason: "${r.finishReason||"length"}", completion tokens: ${r.usage.completionTokens}). Any attempted tool call was truncated before completion and could not be parsed. Please write the output in smaller sections or verify that Max Output Tokens in settings is set sufficiently high.`}):this.messages.push({role:"user",content:"Please execute the required tools to fulfill the objectives of this phase, or call complete_phase when finished, or call fail_phase if a prerequisite/gate failed."})}let n=`Turn limit reached (${e} turns) without completing phase checkpoints.`,a=Math.round((Date.now()-s)/1e3);return this.chatLogger&&await this.chatLogger.logPhaseEnd({phaseTitle:this.phaseTitle||this.phaseName,phaseFileName:this.phaseName,success:!1,summary:n,durationSeconds:a,tokensUsed:this.totalUsage,turnCount:e}),{success:!1,summary:n,tokensUsed:this.totalUsage,phaseName:this.phaseName,turnCount:e}}isPhaseFailureOrHalt(e){if(!e)return!1;let s=e.toLowerCase();return!!([/pre-flight\s+gate\s+fail/i,/specification\s+gate\s+fail/i,/checkpoint\s+gate\s+fail/i,/\bgate\s+failed\b/i,/\bphase\s+(?:[0-9a-zA-Z_]+\s+)?(?:is\s+blocked|remains\s+blocked|cannot\s+be\s+completed|is\s+halted)\b/i,/\bphase_failed\b/i,/\bphase_blocked\b/i,/\bphase_halted\b/i,/\bblocked_specification_gate\b/i,/\bhalt(?:ed)?\s+(?:immediately\s+)?with\s+status\s+`?failed`?/i,/\bhalt\s+directive\b/i].some(i=>i.test(e))||e.includes("\u274C")&&(s.includes("placeholder")||s.includes("blocked")||s.includes("rerun phase")||s.includes("gate")))}};var V=M(require("fs/promises")),G=M(require("path")),ue=class{constructor(e,s=""){this.workspaceRoot=e;this.workspaceRoot=e||"",s?this.setPhase(s):this.pipelineLogPath=this.resolveLogPath("logs/pipeline.md")}currentPhaseTag="";logPath="";consoleLogPath="";pipelineLogPath="";writeQueue=Promise.resolve();setWorkspaceRoot(e){this.workspaceRoot=e||"",this.currentPhaseTag?this.setPhase(this.currentPhaseTag):this.pipelineLogPath=this.resolveLogPath("logs/pipeline.md")}setPhase(e){if(!e)return;let s=G.basename(e).replace(/\.md$/i,"").toLowerCase();s.startsWith("instruct")&&(s="00_install"),this.currentPhaseTag=s,this.logPath=this.resolveLogPath(`logs/${s}/chat.md`),this.consoleLogPath=this.resolveLogPath(`logs/${s}/console.log`),this.pipelineLogPath=this.resolveLogPath("logs/pipeline.md")}getPhaseTag(){return this.currentPhaseTag}getLogPath(){return this.logPath||this.pipelineLogPath}getConsoleLogPath(){return this.consoleLogPath}getPipelineLogPath(){return this.pipelineLogPath}resolveLogPath(e){return G.isAbsolute(e)?e:this.workspaceRoot?G.join(this.workspaceRoot,e):""}async appendToFile(e,s){if(!(!this.workspaceRoot||!e))return this.writeQueue=this.writeQueue.then(async()=>{try{let t=G.dirname(e);await V.mkdir(t,{recursive:!0}),await V.appendFile(e,s+`
`,"utf-8")}catch(t){console.error(`[ChatLogger] Failed to write to ${e}:`,t)}}),this.writeQueue}async append(e){let s=this.logPath||this.pipelineLogPath;return this.appendToFile(s,e)}async ensurePipelineSummaryHeader(){if(!(!this.workspaceRoot||!this.pipelineLogPath))try{await V.stat(this.pipelineLogPath)}catch{let e=["# TidyProteomics Pipeline Execution Summary","","> Master index of autonomous reasoning traces and raw execution logs per phase.","","| Phase | Title | Status | Duration | Total Tokens | Logs |","| :--- | :--- | :--- | :--- | :--- | :--- |"].join(`
`);await this.appendToFile(this.pipelineLogPath,e)}}async logPhaseStart(e){this.setPhase(e.phaseFileName),await this.ensurePipelineSummaryHeader(),this.consoleLogPath&&await this.writeQueue.then(async()=>{try{await V.mkdir(G.dirname(this.consoleLogPath),{recursive:!0}),await V.appendFile(this.consoleLogPath,`=== Phase Started: ${e.phaseTitle} [${new Date().toISOString()}] ===
`,"utf-8")}catch{}});let s=new Date().toISOString(),t=e.systemPromptFiles||["agent/PROTOCOL.md","docs/experiment.md","agent/TIDYPROTEOMICS_CORE.md"],i=e.inputPromptFiles||[e.phaseFileName.includes("/")?e.phaseFileName:`analysis/${e.phaseFileName}`,"docs/notes.md","docs/llm.md","docs/experiment.md"],o=["","---","",`# [${s}] Phase Start: ${e.phaseTitle}`,`- **Phase Directive**: \`${e.phaseFileName}\``,`- **Model**: \`${e.model}\` | **Provider**: \`${e.provider}\``,`- **Console Output**: [\`logs/${this.currentPhaseTag}/console.log\`](./console.log)`,"","### Persistent System Frame (Sent & Cached Prefix)",...t.map(n=>`- \`${n}\``),"","### Input Prompts & Blackboard Directives (Turn 1)",...i.map(n=>`- \`${n}\``),""];await this.append(o.join(`
`))}async logAssistantResponse(e,s,t,i){let n=[`### [${new Date().toISOString()}] Assistant (Turn ${e})`];if(s&&s.trim().length>0&&(n.push(""),n.push(s.trim())),t&&t.length>0){n.push(""),n.push("**Tool Calls**:");for(let a of t)n.push(`- **\`${a.name}\`** (id: \`${a.id}\`)`),n.push("  ```json"),n.push(JSON.stringify(a.args,null,2).split(`
`).map(r=>`  ${r}`).join(`
`)),n.push("  ```")}if(i){let a=i.cachedPromptTokens||0;n.push(""),n.push(`> **Metrics**: Turn Tokens: **${i.totalTokens.toLocaleString()}** (Prompt: ${i.promptTokens.toLocaleString()}, Completion: ${i.completionTokens.toLocaleString()}, Cached: ${a.toLocaleString()})`)}n.push(""),await this.append(n.join(`
`))}async logTruncationWarning(e,s,t){let i=new Date().toISOString(),o=[`> **WARNING (Turn ${e})**: Generation hit output token limit (\`finish_reason: "${s}"\`, completion tokens: **${t.toLocaleString()}**). Response or pending tool calls were truncated mid-stream!`,""];await this.append(o.join(`
`))}async logToolResult(e,s,t,i,o){let n=new Date().toISOString(),a=i?"FAILED":"SUCCESS",r=t?t.trim():"(No output)";if(e==="execute_command"){let l=o?.command||"(command string unavailable)";if(this.consoleLogPath){let f=["================================================================================",`[${n}] Command: ${l}`,`Status: ${a} (id: ${s})`,"================================================================================",r,""].join(`
`);await this.appendToFile(this.consoleLogPath,f)}let c=[`#### [${n}] Tool Result: \`${e}\` [${a}] (id: \`${s}\`)`,`- **Command**: \`${l}\``,`- **Status**: ${i?"\u274C Command failed":"\u2713 Command executed successfully"}`,`- **Console Output**: Logged to [\`logs/${this.currentPhaseTag}/console.log\`](./console.log)`];if(i){let f=r.split(`
`),m=f.filter(w=>/error|failed|exception|cannot|fatal/i.test(w)),g=m.length>0?m.slice(-10):f.slice(-10);c.push("- **Error Excerpt**:"),c.push("  ```text");for(let w of g)c.push(`  ${w.trim()}`);c.push("  ```")}else{let f=r.split(`
`).filter(m=>/CHECKPOINT.*PASS|ALL_CHECKPOINTS_PASSED|PHASE_.*_PASS/i.test(m)).slice(0,3);if(f.length>0)for(let m of f)c.push(`- **Checkpoint Highlight**: \`${m.trim()}\``);else{let m=r.split(`
`).length;c.push(`- **Console Volume**: ${m.toLocaleString()} lines captured in console.log`)}}c.push(""),await this.append(c.join(`
`));return}if(e==="write_file"){let l=o?.filePath||"",d=[`#### [${n}] Tool Result: \`${e}\` [${a}] (id: \`${s}\`)`,`- **Target File**: \`${l}\``,`- **Result**: ${r}`,""];await this.append(d.join(`
`));return}if(e==="read_file"){let l=o?.filePath||"",d=r.split(`
`),c=[`#### [${n}] Tool Result: \`${e}\` [${a}] (id: \`${s}\`)`,`- **Inspected File**: \`${l}\``];if(d.length>25){let f=d.slice(0,15).join(`
`);c.push("```"),c.push(f),c.push(`
... [${(d.length-15).toLocaleString()} lines omitted in chat log for economy] ...`),c.push("```")}else c.push("```"),c.push(r),c.push("```");c.push(""),await this.append(c.join(`
`));return}let p=[`#### [${n}] Tool Result: \`${e}\` [${a}] (id: \`${s}\`)`,"```",r,"```",""];await this.append(p.join(`
`))}async logPhaseEnd(e){let s=new Date().toISOString(),t=e.success?"\u2713":"\u274C",i=e.success?"COMPLETED":"FAILED",o=e.tokensUsed.cachedPromptTokens||0,n=[`### [${s}] ${t} Phase ${i}: ${e.phaseTitle}`,`- **Duration**: ${e.durationSeconds}s | **Total Turns**: ${e.turnCount}`,`- **Cumulative Tokens**: Total: **${e.tokensUsed.totalTokens.toLocaleString()}** | Prompt: ${e.tokensUsed.promptTokens.toLocaleString()} | Completion: ${e.tokensUsed.completionTokens.toLocaleString()} | Cached: ${o.toLocaleString()}`,"- **Logs**: [`chat.md`](./chat.md) | [`console.log`](./console.log)","","**Summary**:",e.summary,"","---",""].join(`
`);if(await this.append(n),this.pipelineLogPath){let a=`| ${t} **${this.currentPhaseTag}** | ${e.phaseTitle} | ${i} | ${e.durationSeconds}s | ${e.tokensUsed.totalTokens.toLocaleString()} | [Chat](./${this.currentPhaseTag}/chat.md) \\| [Console](./${this.currentPhaseTag}/console.log) |`;await this.appendToFile(this.pipelineLogPath,a)}}};var Z=M(require("fs/promises")),ke=M(require("path"));function Qe(v=new Date){let e=a=>a.toString().padStart(2,"0"),s=v.getFullYear(),t=e(v.getMonth()+1),i=e(v.getDate()),o=e(v.getHours()),n=e(v.getMinutes());return`${s}-${t}-${i} ${o}:${n}`}function Ye(v,e="0.1.0",s=new Date){let t=Qe(s),i=(v.provider||"anthropic").toUpperCase(),o=v.model||"claude-3-7-sonnet-20250219",n=v.provider==="anthropic"||v.provider==="openrouter"?"Active \u26A1":"Standard",a=(v.maxTokens||32768).toLocaleString(),r=`${v.timeoutSeconds||600}s`,p=v.apiKey?"Configured":v.provider==="ollama"?"Not Required (Local)":"Missing",l=v.baseUrl&&v.baseUrl.trim()?v.baseUrl.trim():"Default",d=`TidyProteomicsAgent v${e||"0.1.0"}`,c=`${i} | ${o}`;return`# Active Model Summary

Created: ${t}
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
| **Max Output Tokens** | ${a} |
| **Request Timeout** | ${r} |
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
`}async function se(v,e,s="0.1.0"){if(!v)return"";let t=ke.join(v,"docs");await Z.mkdir(t,{recursive:!0});let i=ke.join(t,"llm.md"),o=Ye(e,s);try{let n=await Z.readFile(i,"utf-8"),a=r=>r.replace(/Created:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/g,"");if(a(n)===a(o))return i}catch{}return await Z.writeFile(i,o,"utf-8"),i}var he=class{constructor(e,s,t,i,o,n="0.1.0"){this.workspaceRoot=e;this.client=s;this.tools=t;this.onStateChange=i;this.onLog=o;this.extensionVersion=n;this.workspaceRoot=e||"",this.chatLogger=new ue(this.workspaceRoot),this.workspaceRoot&&this.rescanPhases().catch(a=>{console.error("[PipelineOrchestrator] Error rescanning phases:",a)})}phases=[];isRunning=!1;isFullPipelineRunning=!1;shouldStop=!1;chatLogger;setExtensionVersion(e){this.extensionVersion=e||"0.1.0"}async syncModelSummary(){return this.workspaceRoot?await se(this.workspaceRoot,this.client.getConfig(),this.extensionVersion):""}ts(){return new Date().toTimeString().split(" ")[0]}logPhase(e,s,t=!1){let i=`[${this.ts()}] ${e}: ${s}`;this.onLog(this.truncateTo(i,120),t)}logPipeline(e,s=!1){this.logPhase("Pipeline",e,s)}truncateTo(e,s=120){return e.length<=s?e:e.slice(0,s-3)+"..."}formatToolHeader(e,s){switch(e){case"execute_command":return`[Command] ${String(s?.command||"").trim().replace(/\s+/g," ")}`;case"read_file":{let t=String(s?.filePath||"").trim(),i=s?.startLine?` (lines ${s.startLine}-${Number(s.startLine)+Number(s.maxLines||0)-1})`:"";return`[Read] ${t}${i}`}case"write_file":{let t=String(s?.filePath||"").trim(),i=typeof s?.content=="string"?` (${s.content.length} chars)`:"";return`[Write] ${t}${i}`}case"replace_file_content":return`[Edit] ${String(s?.filePath||"").trim()}`;case"list_directory":{let t=String(s?.dirPath||".").trim();return`[List] ${!t||t==="."||t==="./"?"directory contents":t}`}case"check_checkpoint_gate":return`[Check Gate] ${Array.isArray(s?.requiredFiles)?s.requiredFiles.join(", "):""}`;case"complete_phase":return`[Complete Phase] ${String(s?.phaseName||"").trim()}`;case"fail_phase":{let t=String(s?.phaseName||"").trim(),i=String(s?.reason||"").trim();return`[Halt Phase] ${t}${i?": "+i:""}`}default:{let t=Object.keys(s||{}),i=t.length>0?` (${t.join(", ")})`:"";return`[${e}]${i}`}}}getIsRunning(){return this.isRunning}getIsFullPipelineRunning(){return this.isFullPipelineRunning}async setWorkingDirectory(e){if(this.isRunning){this.logPipeline("Cannot change working directory while a pipeline or phase is actively running.");return}this.workspaceRoot=e||"",this.tools.setWorkspaceRoot(this.workspaceRoot),this.chatLogger.setWorkspaceRoot(this.workspaceRoot);try{await this.rescanPhases()}catch(s){console.error("[PipelineOrchestrator] Error rescanning phases on directory change:",s)}}getWorkingDirectory(){return this.workspaceRoot}async loadNotesRecords(){let e=new Map;if(!this.workspaceRoot)return e;try{let s=A.join(this.workspaceRoot,"docs","notes.md"),i=(await L.readFile(s,"utf-8")).split(/\n(?=###\s+)/);for(let o of i){let n=o.match(/- \*\*File\*\*:\s*`([^`]+)`/);if(!n)continue;let a=n[1].trim(),r=o.match(/- \*\*Duration\*\*:\s*(\d+)s/),p=r?parseInt(r[1],10):void 0,l=o.match(/- \*\*Start\*\*:\s*([^\n\r]+)/),d=l?l[1].trim():void 0,c=o.match(/- \*\*End\*\*:\s*([^\n\r]+)/),f=c?c[1].trim():void 0,m=o.match(/- \*\*Token Usage\*\*:\s*Total:\s*(\d+|N\/A),\s*Prompt:\s*(\d+|N\/A),\s*Completion:\s*(\d+|N\/A)(?:,\s*Cached:\s*(\d+|N\/A))?/i),g;if(m){let P=m[1]!=="N/A"?parseInt(m[1],10):0,C=m[2]!=="N/A"?parseInt(m[2],10):0,$=m[3]!=="N/A"?parseInt(m[3],10):0,H=m[4]&&m[4]!=="N/A"?parseInt(m[4],10):0;g={totalTokens:P,promptTokens:C,completionTokens:$,cachedPromptTokens:H}}let w=o.includes("- COMPLETED"),y=o.includes("- FAILED"),S=w?"completed":y?"failed":"completed",R=o.match(/\*\*Summary\*\*:\s*\n([\s\S]*?)(?:\n---|\n###|$)/),F=R?R[1].trim():void 0,u={status:S,durationSeconds:p,tokenUsage:g,summary:F,startTime:d,endTime:f};e.set(a,u);let E=A.basename(a);e.has(E)||e.set(E,u)}}catch{}return e}async forceReloadFromDisk(){if(this.isRunning){this.logPipeline("Cannot force reload while an active pipeline run is in flight.");return}await this.rescanPhases(!0),this.logPipeline("Reloaded all tasks and progress from disk.")}async resetAllState(){if(this.isRunning){this.logPipeline("Cannot reset state while an active run is in flight.");return}let e=A.join(this.workspaceRoot,"docs","notes.md");try{let s=`# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`;await L.writeFile(e,s,"utf-8")}catch{}for(let s of this.phases)s.status="pending",s.startTime=void 0,s.endTime=void 0,s.durationSeconds=void 0,s.tokenUsage=void 0,s.summary=void 0,s.error=void 0;await this.rescanPhases(!0),this.logPipeline("State and runtime blackboard reset to initial state.")}async rescanPhases(e=!1){if(this.isRunning)return;if(!this.workspaceRoot){this.phases=[],await this.notifyState();return}let s=await this.loadNotesRecords(),t=e?new Map:new Map(this.phases.map(r=>[r.fileName,r])),i=new Map(this.phases.map(r=>[r.fileName,r.enabled])),o=[],n=A.join(this.workspaceRoot,"analysis"),a=!1;try{let p=(await L.readdir(n)).filter(l=>l.endsWith(".md")).sort();for(let l=0;l<p.length;l++){let d=p[l];d.startsWith("00_")&&(a=!0);let c=t.get(d),f=s.get(d)||s.get(A.basename(d)),m=c?.title;if(!m){try{let F=(await L.readFile(A.join(n,d),"utf-8")).split(`
`).find(u=>u.trim().startsWith("#"));F&&(m=F.replace(/^#+\s*/,"").trim())}catch{}m||(m=d.replace(/^[0-9]+_/,"").replace(/\.md$/,"").replace(/_/g," "),m=`Phase: ${m}`)}let g=d.match(/^([0-9]+)/)?.[1]||String(l+1).padStart(2,"0"),w=d.startsWith("00_"),y="pending";c?.status&&c.status!=="running"?y=c.status:f?.status&&(y=f.status);let S=i.has(d)?i.get(d):c?c.enabled:!0;o.push({id:g,fileName:d,title:m,status:y,enabled:S,isMasterSetup:w,startTime:c?.startTime||f?.startTime,endTime:c?.endTime||f?.endTime,durationSeconds:c?.durationSeconds||f?.durationSeconds,tokenUsage:c?.tokenUsage||f?.tokenUsage,summary:c?.summary||f?.summary,error:c?.error||(y==="failed"?f?.summary:void 0)})}}catch{this.logPipeline(`Note: 'analysis' directory not found in ${this.workspaceRoot}`)}if(!a){let r="agent/INSTRUCT.md",p=A.join(this.workspaceRoot,"agent","INSTRUCT.md");try{await L.stat(p)}catch{r="prompts/INSTRUCT.md",p=A.join(this.workspaceRoot,"prompts","INSTRUCT.md")}try{await L.stat(p);let l=t.get(r)||t.get("agent/INSTRUCT.md")||t.get("prompts/INSTRUCT.md"),d=s.get(r)||s.get("agent/INSTRUCT.md")||s.get("prompts/INSTRUCT.md")||s.get("INSTRUCT.md"),c="pending";l?.status&&l.status!=="running"?c=l.status:d?.status&&(c=d.status);let f=i.has(r)?i.get(r):l?l.enabled:!0;o.unshift({id:"00",fileName:r,title:"Phase 0: Master Setup & Environment",status:c,enabled:f,isMasterSetup:!0,startTime:l?.startTime||d?.startTime,endTime:l?.endTime||d?.endTime,durationSeconds:l?.durationSeconds||d?.durationSeconds,tokenUsage:l?.tokenUsage||d?.tokenUsage,summary:l?.summary||d?.summary,error:l?.error||(c==="failed"?d?.summary:void 0)})}catch{}}this.phases=o,await this.notifyState()}async getPromptFiles(){let e="agent";try{await L.stat(A.join(this.workspaceRoot,"agent"))}catch{e="prompts"}let s=[{name:"Analysis Protocol",relPath:`${e}/PROTOCOL.md`}];try{let o=(await L.readdir(A.join(this.workspaceRoot,e))).filter(n=>n.startsWith("TIDYPROTEOMICS_")&&n.endsWith(".md")).sort();for(let n of o){let a=n.replace(/\.md$/,"").replace(/_/g," ");s.push({name:a,relPath:`${e}/${n}`})}}catch{}s.push({name:"Experiment & Dataset Spec",relPath:"docs/experiment.md"},{name:"Shared Memory",relPath:"docs/notes.md"},{name:"Active Model Summary",relPath:"docs/llm.md"},{name:"Pipeline Summary",relPath:"logs/pipeline.md"});try{let i=A.join(this.workspaceRoot,"logs"),o=await L.readdir(i,{withFileTypes:!0});for(let n of o)if(n.isDirectory()){let a=n.name,r=`logs/${a}/chat.md`,p=`logs/${a}/console.log`;s.push({name:`${a} Chat Trace`,relPath:r}),s.push({name:`${a} Console Log`,relPath:p})}}catch{}try{await L.stat(A.join(this.workspaceRoot,"logs/llm_chat.md")),s.push({name:"Legacy LLM Chat Log",relPath:"logs/llm_chat.md"})}catch{}try{await L.stat(A.join(this.workspaceRoot,`${e}/BIOLOGY.md`)),s.splice(1,0,{name:"Curated Biological Context",relPath:`${e}/BIOLOGY.md`})}catch{}try{await L.stat(A.join(this.workspaceRoot,`${e}/VARIABLES.md`)),s.splice(1,0,{name:"Legacy Dataset Variables",relPath:`${e}/VARIABLES.md`})}catch{}let t=[];for(let i of s){let o=!1;try{await L.stat(A.join(this.workspaceRoot,i.relPath)),o=!0}catch{o=!1}t.push({...i,exists:o})}return t}getPhases(){return[...this.phases]}togglePhase(e,s){let t=this.phases.find(i=>i.id===e);t&&(t.enabled=s,this.notifyState())}async addPhase(e,s){let t=e.endsWith(".md")?e:`${e}.md`,i=A.join(this.workspaceRoot,"analysis");await L.mkdir(i,{recursive:!0});let o=A.join(i,t),a=`### Phase: ${s||t.replace(/\.md$/,"").replace(/_/g," ")}
Construct and execute code for this phase, capturing output to logs.

#### Tasks:
- [ ] Task 1: Initialize step.
- [ ] Task 2: Execute analysis in R or shell.
- [ ] Checkpoint: Verify outputs and log files.
`;return await L.writeFile(o,a,"utf-8"),await this.rescanPhases(),o}async removePhase(e){let s=this.phases.findIndex(t=>t.id===e);if(s!==-1){let t=this.phases[s];if(!t.isMasterSetup)try{await L.unlink(A.join(this.workspaceRoot,"analysis",t.fileName))}catch{}this.phases.splice(s,1),await this.notifyState()}}async getFoldersStatus(){let e="agent";try{await L.stat(A.join(this.workspaceRoot,"agent"))}catch{e="prompts"}let s=[{name:"analysis",relPath:"analysis",description:"Phase Prompts (00_INSTALL.md .. 10_SYNTHESIS.md)"},{name:e,relPath:e,description:"Protocol, Variables & Skills (Cached Prefix)"},{name:"code",relPath:"code",description:"Generated Analysis Scripts"},{name:"tools",relPath:"tools",description:"Linter & Execution Helper Utilities"},{name:"docs",relPath:"docs",description:"Shared Memory (notes.md, llm.md) & Experiment Design"},{name:"logs",relPath:"logs",description:"Phase Chat Traces & Console Logs (logs/<phase>/)"},{name:"data",relPath:"data",description:"Raw Input Proteomics Data"}],t=[];if(!this.workspaceRoot)return t;for(let i of s){let o=A.join(this.workspaceRoot,i.relPath),n=!1,a=0;try{(await L.stat(o)).isDirectory()&&(n=!0,a=(await L.readdir(o)).filter(l=>!l.startsWith(".")).length)}catch{n=!1}t.push({...i,exists:n,itemCount:a})}return t}async getState(){let e=this.client.getConfig(),s=0,t=0,i=0,o=0;for(let l of this.phases)l.tokenUsage&&(s+=l.tokenUsage.promptTokens,t+=l.tokenUsage.completionTokens,i+=l.tokenUsage.totalTokens,o+=l.tokenUsage.cachedPromptTokens||0);let n=await this.getPromptFiles(),a=await this.getFoldersStatus(),r=a.find(l=>l.name==="analysis"),p=!this.workspaceRoot||!r||!r.exists||(r.itemCount||0)===0||this.phases.length===0;return{workingDirectory:this.workspaceRoot,workspaceName:this.workspaceRoot?A.basename(this.workspaceRoot):"No Folder Open",model:e.model,provider:e.provider,startTime:new Date().toISOString(),isRunning:this.isRunning,isFullPipelineRunning:this.isFullPipelineRunning,currentPhaseIndex:this.phases.findIndex(l=>l.status==="running"),phases:this.phases,promptFiles:n,folders:a,totalTokens:{promptTokens:s,completionTokens:t,totalTokens:i,cachedPromptTokens:o},isAnalysisMissingOrEmpty:p,literature:J(this.workspaceRoot),knowledgeCorpus:J(this.workspaceRoot)}}async notifyState(){try{let e=await this.getState();this.onStateChange(e)}catch(e){console.error("[PipelineOrchestrator] Error in notifyState:",e)}}stop(){this.shouldStop=!0,this.isFullPipelineRunning=!1;for(let e of this.phases)e.status==="running"&&(e.status="failed",e.error="Stopped by user");this.isRunning=!1,this.logPipeline("Execution stopped by user."),this.notifyState()}async pruneNotesFromPhase(e){if(!this.workspaceRoot)return;let s=this.phases.slice(e);if(s.length===0)return;let t=new Set;for(let o of s)t.add(o.fileName),t.add(A.basename(o.fileName)),o.isMasterSetup&&(t.add("agent/INSTRUCT.md"),t.add("prompts/INSTRUCT.md"),t.add("INSTRUCT.md"));let i=A.join(this.workspaceRoot,"docs","notes.md");try{let n=(await L.readFile(i,"utf-8")).split(/\n(?=###\s+)/),a=[];for(let p of n){let l=p.match(/- \*\*File\*\*:\s*`([^`]+)`/);if(l){let d=l[1].trim(),c=A.basename(d);if(t.has(d)||t.has(c))continue}a.push(p)}let r=a.join(`
`).replace(/\n{3,}/g,`

`).trim()+`
`;await L.writeFile(i,r,"utf-8")}catch{}}async runSinglePhase(e){if(this.isRunning){this.logPipeline("Execution busy: A pipeline or phase is already running. Please wait or stop it first.");return}let s=this.phases.findIndex(t=>t.id===e);if(s===-1){this.logPipeline(`Phase ID '${e}' not found.`);return}for(let t=s;t<this.phases.length;t++){let i=this.phases[t];t===s?(i.status="running",i.startTime=new Date().toISOString(),i.endTime=void 0,i.durationSeconds=void 0,i.tokenUsage=void 0,i.summary=void 0,i.error=void 0):(i.status="pending",i.startTime=void 0,i.endTime=void 0,i.durationSeconds=void 0,i.tokenUsage=void 0,i.summary=void 0,i.error=void 0)}await this.pruneNotesFromPhase(s),await this.notifyState(),this.isRunning=!0,this.isFullPipelineRunning=!1,this.shouldStop=!1;try{await this.executePhase(s)}catch(t){this.logPipeline(`Error running phase ${e}: ${t.message}`)}finally{this.isRunning=!1,this.isFullPipelineRunning=!1,await this.notifyState()}}async runFullPipeline(){if(this.isRunning){this.logPipeline("Execution busy: A pipeline is already running.");return}if(!this.workspaceRoot||this.phases.length===0){this.logPipeline("No analysis tasks found to execute. Please initialize an analysis pipeline first.");return}this.isRunning=!0,this.isFullPipelineRunning=!0,this.shouldStop=!1,this.logPipeline(`Starting autonomous run at ${new Date().toLocaleTimeString()}`),this.logPipeline(`Working Directory: ${this.workspaceRoot}`);try{for(let e=0;e<this.phases.length;e++){if(this.shouldStop){this.logPipeline("Execution stopped by user.");break}let s=this.phases[e];if(!s.enabled){this.logPipeline(`Skipping disabled phase: ${s.title}`);continue}if(await this.pruneNotesFromPhase(e),!await this.executePhase(e)){this.logPipeline(`Pipeline paused due to checkpoint failure in ${s.title}`);break}}}catch(e){this.logPipeline(`Full pipeline error: ${e.message}`)}finally{this.isRunning=!1,this.isFullPipelineRunning=!1,this.shouldStop=!1,await this.notifyState()}}async executePhase(e){let s=this.phases[e]?.id,t=()=>{if(s){let p=this.phases.find(l=>l.id===s);if(p)return p}return this.phases[e]},i=t();if(!i)return!1;let o=A.basename(i.fileName).replace(/\.md$/i,""),n=(i.title||"").replace(/^Phase\s+\d+:\s*/i,"").trim();this.chatLogger.setPhase(i.fileName),i.status="running",i.startTime=new Date().toISOString(),i.endTime=void 0,i.error=void 0,i.tokenUsage||(i.tokenUsage={promptTokens:0,completionTokens:0,totalTokens:0,cachedPromptTokens:0});let a=Date.now();await this.notifyState(),this.logPhase(o,`[Starting] ${n} (${i.fileName})`);let r;try{try{await se(this.workspaceRoot,this.client.getConfig(),this.extensionVersion)}catch(g){console.warn("[PipelineOrchestrator] Could not write docs/llm.md before phase execution:",g)}let l=await new de(this.workspaceRoot).buildPhaseContext(i.fileName),d="";r=new pe(i.fileName,i.title,this.client,this.tools,l,async g=>{if(g.type==="thought"){let w=String(g.data||"").trim(),y=w.match(/Starting Turn\s+(\d+\/\d+)\.{0,3}/i);if(y)this.logPhase(o,`Turn ${y[1]} ...`);else{let S=w.replace(/^[⚠️🔄❌✓💡]\s*/g,"").trim();this.logPhase(o,S)}}else if(g.type!=="text"){if(g.type==="tool_start"){let w=this.formatToolHeader(g.data.name,g.data.args),y=`[${this.ts()}] ${o}: `,S=Math.max(25,100-y.length-18),R=w;R.length>S&&(R=R.slice(0,S-3).trim()),R.endsWith("...")&&(R=R.slice(0,-3).trim()),d=`${y}${R} ...`,this.onLog(d,!1)}else if(g.type==="tool_end"){let w=d?d.replace(/\s*\.{3}$/,""):`[${this.ts()}] ${o}: [${g.data.name}]`;if(g.data.isError){this.onLog(`${w} ... \u274C  [failed]`,!0);let y="failed";if(g.data.result){let S=String(g.data.result).trim().split(`
`)[0].trim();S&&!S.startsWith("{")&&S.length<50&&(y=`failed: ${S.replace(/^Error:\s*/i,"")}`)}this.logPhase(o,`\u274C  ${y}`,!1)}else this.onLog(`${w} ...  \u2713 [completed]`,!0);d=""}else if(g.type==="tokens"){let w=t();w.tokenUsage={...g.data.totalUsage},await this.notifyState()}}},this.chatLogger,()=>this.shouldStop);let c=await r.run(),f=Math.max(1,Math.round((Date.now()-a)/1e3)),m=t();if(m.endTime=new Date().toISOString(),m.durationSeconds=f,m.tokenUsage=c.tokensUsed,m.summary=c.summary,c.success)return m.status="completed",this.logPhase(o,`[Completed] ${n} in ${f}s (${c.tokensUsed.totalTokens.toLocaleString()} tokens)`),await this.appendPhaseRecordToNotes(m),await this.notifyState(),!0;{m.status="failed",m.error=c.summary;let w=String(c.summary||"Phase failed").trim().split(`
`),y=w[0];this.logPhase(o,`\u274C [Failed] ${n}: ${y}`);for(let S=1;S<w.length;S++){let R=w[S].trim();R&&this.logPhase(o,`  ${R}`)}return await this.appendPhaseRecordToNotes(m),await this.notifyState(),!1}}catch(p){let l=t();return l.status="failed",l.error=p.message,r&&(!l.tokenUsage||l.tokenUsage.totalTokens===0)&&(l.tokenUsage=r.getTotalUsage()),this.logPhase(o,`\u274C Error in ${n}: ${p.message}`),await this.notifyState(),!1}}async appendPhaseRecordToNotes(e){let s=A.join(this.workspaceRoot,"docs","notes.md"),t=e.status==="failed"?"FAILED":"COMPLETED",i=e.summary||(e.status==="failed"?e.error||"Phase halted or failed.":"Phase checkpoints verified."),o=`
### ${e.title} - ${t}
- **File**: \`${e.fileName}\`
- **Duration**: ${e.durationSeconds}s
- **Start**: ${e.startTime}
- **End**: ${e.endTime}
- **Token Usage**: Total: ${e.tokenUsage?.totalTokens||"N/A"}, Prompt: ${e.tokenUsage?.promptTokens||"N/A"}, Completion: ${e.tokenUsage?.completionTokens||"N/A"}, Cached: ${e.tokenUsage?.cachedPromptTokens||0}
- **Summary**:
${i}

---
`;try{await L.mkdir(A.dirname(s),{recursive:!0});let n="";try{n=await L.readFile(s,"utf-8")}catch{n=`# Autonomous Proteomics Analysis Notes
Model: ${this.client.getConfig().model}

`}await L.writeFile(s,n+o,"utf-8")}catch(n){this.logPipeline(`Warning: Failed to update docs/notes.md: ${n}`)}}};var me=class{constructor(e){this.config=e}updateConfig(e){this.config={...this.config,...e}}getConfig(){return{...this.config}}getTimeoutSeconds(){return this.config.timeoutSeconds&&this.config.timeoutSeconds>0?this.config.timeoutSeconds:600}getTimeoutMs(){return this.getTimeoutSeconds()*1e3}async chat(e){switch(this.config.provider){case"anthropic":return this.chatAnthropic(e);case"gemini":return this.chatGemini(e);case"openrouter":return this.chatOpenRouter(e);case"ollama":return this.chatOllama(e);case"openai":default:return this.chatOpenAI(e)}}async chatAnthropic(e){let s="https://api.anthropic.com/v1/messages",t=e.tools.map(C=>({name:C.name,description:C.description,input_schema:C.parameters})),i=[],o=0;for(;o<e.messages.length;){let C=e.messages[o];if(C.role==="system"){o++;continue}if(C.role==="tool"){let $=[];for(;o<e.messages.length&&e.messages[o].role==="tool";){let H=e.messages[o];$.push({type:"tool_result",tool_use_id:H.tool_call_id,content:H.content}),o++}i.push({role:"user",content:$});continue}else if(C.role==="assistant"&&C.tool_calls&&C.tool_calls.length>0){let $=[];C.content&&$.push({type:"text",text:C.content});for(let H of C.tool_calls)$.push({type:"tool_use",id:H.id,name:H.name,input:H.args});i.push({role:"assistant",content:$})}else i.push({role:C.role==="assistant"?"assistant":"user",content:C.content});o++}let n=[];for(let C of i){let $=n[n.length-1];if($&&$.role===C.role){let H=Array.isArray($.content)?$.content:[{type:"text",text:String($.content)}],T=Array.isArray(C.content)?C.content:[{type:"text",text:String(C.content)}];$.content=[...H,...T]}else n.push(C)}for(;n.length>0&&n[0].role==="assistant";)n.shift();n.length===0&&n.push({role:"user",content:"Hello"});let a=[{type:"text",text:e.system,cache_control:{type:"ephemeral"}}],r=this.config.maxTokens||16384,p={model:this.config.model||"claude-3-7-sonnet-20250219",max_tokens:r,temperature:this.config.temperature??.2,system:a,messages:n,tools:t},l=this.getTimeoutSeconds(),d;try{d=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":this.config.apiKey,"anthropic-version":"2023-06-01","anthropic-beta":"prompt-caching-2024-07-31"},body:JSON.stringify(p),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(C){throw C.name==="TimeoutError"||C.message&&C.message.includes("timeout")?new Error(`Anthropic API request timed out after ${l}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):C}if(!d.ok){let C=await d.text();throw new Error(`Anthropic API error (${d.status}): ${C}`)}let c=await d.json(),f="",m=[];for(let C of c.content||[])C.type==="text"?(f+=C.text,e.onToken&&e.onToken(C.text)):C.type==="tool_use"&&m.push({id:C.id,name:C.name,args:C.input||{}});let g=c.stop_reason,w=g==="max_tokens";w&&console.warn(`[ProviderClient] Anthropic generation cut off: hit max_tokens limit (${r}).`);let y=c.usage?.cache_read_input_tokens||0,S=c.usage?.cache_creation_input_tokens||0,R=c.usage?.input_tokens||0,F=c.usage?.output_tokens||0,u=R+y+S,E=u+F,P={promptTokens:u,completionTokens:F,totalTokens:E,cachedPromptTokens:y};return{content:f,tool_calls:m.length>0?m:void 0,usage:P,finishReason:g,truncationDetected:w}}async chatGemini(e){let t=`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model||"gemini-1.5-pro"}:generateContent?key=${this.config.apiKey}`,i=[{functionDeclarations:e.tools.map(P=>({name:P.name,description:P.description,parameters:P.parameters}))}],o=[],n=0;for(;n<e.messages.length;){let P=e.messages[n];if(P.role==="system"){n++;continue}if(P.role==="tool"){let C=[];for(;n<e.messages.length&&e.messages[n].role==="tool";){let $=e.messages[n];C.push({functionResponse:{name:$.tool_name||$.tool_call_id||"tool_result",response:{output:$.content}}}),n++}o.push({role:"user",parts:C});continue}else if(P.role==="assistant"&&P.tool_calls){let C=[];P.content&&C.push({text:P.content});for(let $ of P.tool_calls)C.push({functionCall:{name:$.name,args:$.args}});o.push({role:"model",parts:C})}else o.push({role:P.role==="assistant"?"model":"user",parts:[{text:P.content}]});n++}let a=[];for(let P of o){let C=a[a.length-1];C&&C.role===P.role?C.parts.push(...P.parts):a.push(P)}for(;a.length>0&&a[0].role==="model";)a.shift();a.length===0&&a.push({role:"user",parts:[{text:"Hello"}]});let r=this.config.maxTokens||16384,p={systemInstruction:{parts:[{text:e.system}]},contents:a,tools:i,generationConfig:{temperature:this.config.temperature??.2,maxOutputTokens:r}},l=this.getTimeoutSeconds(),d;try{d=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(P){throw P.name==="TimeoutError"||P.message&&P.message.includes("timeout")?new Error(`Gemini API request timed out after ${l}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):P}if(!d.ok){let P=await d.text();throw new Error(`Gemini API error (${d.status}): ${P}`)}let c=await d.json(),f=c.candidates?.[0],m=f?.finishReason,g=m==="MAX_TOKENS";g&&console.warn(`[ProviderClient] Gemini generation cut off: hit MAX_TOKENS limit (${r}).`);let w="",y=[];for(let P of f?.content?.parts||[])P.text&&(w+=P.text,e.onToken&&e.onToken(P.text)),P.functionCall&&y.push({id:`call_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,name:P.functionCall.name,args:P.functionCall.args||{}});let S=c.usageMetadata?.promptTokenCount||0,R=c.usageMetadata?.candidatesTokenCount||0,F=c.usageMetadata?.cachedContentTokenCount||0,u=c.usageMetadata?.totalTokenCount??S+R,E={promptTokens:S,completionTokens:R,totalTokens:u,cachedPromptTokens:F};return{content:w,tool_calls:y.length>0?y:void 0,usage:E,finishReason:m,truncationDetected:g}}async chatOpenAI(e){let t=`${this.config.baseUrl||"https://api.openai.com/v1"}/chat/completions`,i=e.tools.map(u=>({type:"function",function:{name:u.name,description:u.description,parameters:u.parameters}})),o=[{role:"system",content:e.system}];for(let u of e.messages)u.role==="tool"?o.push({role:"tool",tool_call_id:u.tool_call_id,content:u.content}):u.role==="assistant"&&u.tool_calls?o.push({role:"assistant",content:u.content||null,tool_calls:u.tool_calls.map(E=>({id:E.id,type:"function",function:{name:E.name,arguments:JSON.stringify(E.args)}}))}):o.push({role:u.role,content:u.content});let n=this.config.maxTokens||16384,a={model:this.config.model||"gpt-4o",messages:o,tools:i.length>0?i:void 0,temperature:this.config.temperature??.2,max_tokens:n},r=this.getTimeoutSeconds(),p;try{p=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.config.apiKey}`},body:JSON.stringify(a),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(u){throw u.name==="TimeoutError"||u.message&&u.message.includes("timeout")?new Error(`OpenAI API request timed out after ${r}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):u}if(!p.ok){let u=await p.text();throw new Error(`OpenAI API error (${p.status}): ${u}`)}let l=await p.json(),d=l.choices?.[0]?.message,c=l.choices?.[0]?.finish_reason,f=c==="length"||c==="max_tokens",m=d?.content||"";m&&e.onToken&&e.onToken(m);let g=[];for(let u of d?.tool_calls||[])try{g.push({id:u.id,name:u.function.name,args:typeof u.function.arguments=="string"?JSON.parse(u.function.arguments):u.function.arguments||{}})}catch(E){console.error(`[ProviderClient] Failed to parse tool call arguments for ${u.function?.name}:`,E),f&&console.error(`[ProviderClient] Output truncated at max_tokens (${n}) with finish_reason="${c}". Tool call JSON was incomplete.`)}let w=l.usage?.prompt_tokens||0,y=l.usage?.completion_tokens||0,S=l.usage?.prompt_tokens_details?.cached_tokens||0,R=l.usage?.total_tokens??w+y,F={promptTokens:w,completionTokens:y,totalTokens:R,cachedPromptTokens:S};return{content:m,tool_calls:g.length>0?g:void 0,usage:F,finishReason:c,truncationDetected:f}}async chatOpenRouter(e){let t=`${(this.config.baseUrl||"https://openrouter.ai/api/v1").replace(/\/+$/,"")}/chat/completions`,i=e.tools.map(u=>({type:"function",function:{name:u.name,description:u.description,parameters:u.parameters}})),o=[{role:"system",content:e.system}];for(let u of e.messages)u.role==="tool"?o.push({role:"tool",tool_call_id:u.tool_call_id,content:u.content}):u.role==="assistant"&&u.tool_calls?o.push({role:"assistant",content:u.content||null,tool_calls:u.tool_calls.map(E=>({id:E.id,type:"function",function:{name:E.name,arguments:JSON.stringify(E.args)}}))}):o.push({role:u.role,content:u.content});let n=this.config.maxTokens||32768,a={model:this.config.model||"anthropic/claude-3.7-sonnet",messages:o,tools:i.length>0?i:void 0,temperature:this.config.temperature??.2,max_tokens:n},r=this.getTimeoutSeconds(),p;try{p=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.config.apiKey}`,"HTTP-Referer":"https://github.com/tidyproteomicsagent","X-Title":"TidyProteomicsAgent"},body:JSON.stringify(a),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(u){throw u.name==="TimeoutError"||u.message&&u.message.includes("timeout")?new Error(`OpenRouter API request timed out after ${r}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`):u}if(!p.ok){let u=await p.text();throw new Error(`OpenRouter API error (${p.status}): ${u}`)}let l=await p.json(),d=l.choices?.[0]?.message,c=l.choices?.[0]?.finish_reason,f=c==="length"||c==="max_tokens",m=d?.content||"";m&&e.onToken&&e.onToken(m);let g=[];for(let u of d?.tool_calls||[])try{g.push({id:u.id,name:u.function.name,args:typeof u.function.arguments=="string"?JSON.parse(u.function.arguments):u.function.arguments||{}})}catch(E){console.error(`[ProviderClient] Failed to parse tool call arguments for ${u.function?.name}:`,E),f&&console.error(`[ProviderClient] Output truncated at max_tokens (${n}) with finish_reason="${c}". Tool call JSON was incomplete.`)}let w=l.usage?.prompt_tokens||0,y=l.usage?.completion_tokens||0,S=l.usage?.prompt_tokens_details?.cached_tokens??l.usage?.cache_read_input_tokens??0,R=l.usage?.total_tokens??w+y,F={promptTokens:w,completionTokens:y,totalTokens:R,cachedPromptTokens:S};return{content:m,tool_calls:g.length>0?g:void 0,usage:F,finishReason:c,truncationDetected:f}}async chatOllama(e){let s=(this.config.baseUrl||"http://localhost:11434").replace(/\/+$/,"");s.endsWith("/v1")||(s+="/v1");let t=`${s}/chat/completions`,i=e.tools.map(u=>({type:"function",function:{name:u.name,description:u.description,parameters:u.parameters}})),o=[{role:"system",content:e.system}];for(let u of e.messages)u.role==="tool"?o.push({role:"tool",tool_call_id:u.tool_call_id,content:u.content}):u.role==="assistant"&&u.tool_calls?o.push({role:"assistant",content:u.content||null,tool_calls:u.tool_calls.map(E=>({id:E.id,type:"function",function:{name:E.name,arguments:JSON.stringify(E.args)}}))}):o.push({role:u.role,content:u.content});let n=this.config.maxTokens||16384,a={model:this.config.model||"llama3.3:70b",messages:o,tools:i.length>0?i:void 0,temperature:this.config.temperature??.2,max_tokens:n,options:{num_predict:n},stream:!1},r={"Content-Type":"application/json"};this.config.apiKey&&(r.Authorization=`Bearer ${this.config.apiKey}`);let p=this.getTimeoutSeconds(),l;try{l=await fetch(t,{method:"POST",headers:r,body:JSON.stringify(a),signal:AbortSignal.timeout(this.getTimeoutMs())})}catch(u){throw u.name==="TimeoutError"||u.message&&u.message.includes("timeout")?new Error(`Remote Ollama API request timed out after ${p}s at ${t}. For local/remote 70B models, increase Request Timeout in settings.`):u}if(!l.ok){let u=await l.text();throw new Error(`Remote Ollama API error at ${t} (${l.status}): ${u}`)}let d=await l.json(),c=d.choices?.[0]?.message,f=d.choices?.[0]?.finish_reason||d.done_reason,m=f==="length",g=c?.content||"";g&&e.onToken&&e.onToken(g);let w=[];for(let u of c?.tool_calls||[])try{w.push({id:u.id||`call_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,name:u.function.name,args:typeof u.function.arguments=="string"?JSON.parse(u.function.arguments):u.function.arguments||{}})}catch(E){console.error(`[ProviderClient] Failed to parse tool call arguments for ${u.function?.name}:`,E),m&&console.error(`[ProviderClient] Output truncated at max_tokens (${n}) with finish_reason="${f}".`)}let y=d.usage?.prompt_tokens??d.prompt_eval_count??0,S=d.usage?.completion_tokens??d.eval_count??0,R=d.usage?.total_tokens??y+S,F={promptTokens:y,completionTokens:S,totalTokens:R,cachedPromptTokens:0};return{content:g,tool_calls:w.length>0?w:void 0,usage:F,finishReason:f,truncationDetected:m}}};var W=M(require("fs/promises")),ie=M(require("fs")),Me=M(require("readline")),N=M(require("path")),$e=require("child_process"),De=require("util"),Je=(0,De.promisify)($e.exec),ge=class{constructor(e){this.workspaceRoot=e;this.workspaceRoot=e||"",this.registerDefaultTools()}tools=new Map;setWorkspaceRoot(e){this.workspaceRoot=e||""}getDefinitions(){return Array.from(this.tools.values()).map(e=>e.definition)}async execute(e,s){let t=this.tools.get(e);if(!t)return{tool_call_id:"",content:`Error: Tool '${e}' not found. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,isError:!0};try{return{tool_call_id:"",content:await t.execute(s),isError:!1}}catch(i){return{tool_call_id:"",content:`Error executing tool '${e}': ${i.message||String(i)}`,isError:!0}}}resolvePath(e){let s=this.workspaceRoot||"";if(!s)throw new Error("No active workspace directory set.");let t=N.isAbsolute(e)?N.resolve(e):N.resolve(s,e),i=N.resolve(s);if(t!==i&&!t.startsWith(i+N.sep))throw new Error(`Security restriction: access to '${e}' outside workspace root is denied.`);return t}assertNotProtected(e){let s=this.workspaceRoot||"",t=N.isAbsolute(e)?N.resolve(e):N.resolve(s,e),i=s?N.relative(N.resolve(s),t).replace(/\\/g,"/"):e.replace(/\\/g,"/");if(["docs/llm.md","agent/PROTOCOL.md","agent/VARIABLES.md"].some(n=>i===n||i.endsWith("/"+n))||i.startsWith("agent/TIDYPROTEOMICS_")||i.includes("/agent/TIDYPROTEOMICS_"))throw new Error(`Security Policy Violation: '${e}' is a protected user or extension specification file and cannot be modified by the agent. Record runtime logs in 'docs/notes.md' and biological findings across docs/ (observations.md, knowledge.md, websearch.md, literature.md).`)}registerDefaultTools(){this.tools.set("execute_command",{definition:{name:"execute_command",description:"Executes a shell command in the workspace directory (e.g. running Rscript code/01_inspect_dataset.R). Captures stdout and stderr.",parameters:{type:"object",properties:{command:{type:"string",description:"The shell command line to run"},timeoutMs:{type:"number",description:"Optional execution timeout in milliseconds (default: 600000ms / 10m)"}},required:["command"]}},execute:async e=>{let s=e.timeoutMs||6e5;try{let t=this.workspaceRoot;if(!t)throw new Error("Cannot execute command: No active workspace directory is configured.");let i=process.platform==="win32"?void 0:process.env.SHELL&&ie.existsSync(process.env.SHELL)?process.env.SHELL:ie.existsSync("/bin/bash")?"/bin/bash":"/bin/sh",{stdout:o,stderr:n}=await Je(e.command,{cwd:t,timeout:s,maxBuffer:10*1024*1024,shell:i}),a="";return o&&(a+=`STDOUT:
${o}
`),n&&(a+=`STDERR:
${n}
`),a.trim()||"Command executed successfully with no console output."}catch(t){let i=`Command failed with exit code ${t.code??"unknown"}
`;return t.stdout&&(i+=`STDOUT:
${t.stdout}
`),t.stderr&&(i+=`STDERR:
${t.stderr}
`),t.message&&(i+=`Error message: ${t.message}
`),i}}}),this.tools.set("read_file",{definition:{name:"read_file",description:"Reads file content from the workspace with optional startLine and maxLines for context economy.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative or absolute path to the file to read"},startLine:{type:"number",description:"Optional 1-based start line number"},maxLines:{type:"number",description:"Optional maximum lines to read (prevents dumping large logs or tables)"}},required:["filePath"]}},execute:async e=>{let s=this.resolvePath(e.filePath),t=Math.max(1,e.startLine||1),i=Math.max(1,e.maxLines||2e3),o=ie.createReadStream(s,{encoding:"utf-8"}),n=Me.createInterface({input:o,crlfDelay:1/0}),a=[],r=0,p=0;for await(let d of n)r++,p=r,r>=t&&a.length<i&&a.push(`${r}: ${d}`);let l=a.length>0?t+a.length-1:t;return`File: ${e.filePath} (Lines ${t}-${l} of ${p}):
${a.join(`
`)}`}}),this.tools.set("write_file",{definition:{name:"write_file",description:"Creates or overwrites a file in the workspace with new content.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative path to the file to write"},content:{type:"string",description:"Complete text content to write into the file"}},required:["filePath","content"]}},execute:async e=>{this.assertNotProtected(e.filePath);let s=this.resolvePath(e.filePath);return await W.mkdir(N.dirname(s),{recursive:!0}),await W.writeFile(s,e.content,"utf-8"),`Successfully wrote ${e.content.length} characters to ${e.filePath}`}}),this.tools.set("replace_file_content",{definition:{name:"replace_file_content",description:"Replaces an exact target substring with replacement content in an existing file. Note: For analysis scripts and files under 150 lines, prefer 'write_file' to overwrite the complete file cleanly and avoid whitespace mismatch errors.",parameters:{type:"object",properties:{filePath:{type:"string",description:"Relative path to the file to edit"},targetContent:{type:"string",description:"Exact substring to find and replace"},replacementContent:{type:"string",description:"New content to replace the target substring with"}},required:["filePath","targetContent","replacementContent"]}},execute:async e=>{this.assertNotProtected(e.filePath);let s=this.resolvePath(e.filePath),t=await W.readFile(s,"utf-8");if(!t.includes(e.targetContent))throw new Error(`Target content was not found in ${e.filePath}. Ensure exact whitespace and line match.`);let i=t.replace(e.targetContent,()=>e.replacementContent);return await W.writeFile(s,i,"utf-8"),`Successfully replaced content in ${e.filePath}`}}),this.tools.set("list_directory",{definition:{name:"list_directory",description:"Lists files and folders inside a given workspace directory.",parameters:{type:"object",properties:{dirPath:{type:"string",description:"Relative path to directory to inspect (e.g. 'data', 'logs', 'code')"}},required:["dirPath"]}},execute:async e=>{let s=this.resolvePath(e.dirPath||"."),i=(await W.readdir(s,{withFileTypes:!0})).map(o=>`${o.isDirectory()?"[DIR]":"[FILE]"} ${o.name}`).join(`
`);return`Directory '${e.dirPath}':
${i||"(empty)"}`}}),this.tools.set("check_checkpoint_gate",{definition:{name:"check_checkpoint_gate",description:"Checks whether required checkpoint files exist, are non-empty, and returns their file size.",parameters:{type:"object",properties:{requiredFiles:{type:"array",description:"Array of relative paths to files that must exist (e.g. ['logs/01_data_quality.log', 'data/tidyproteomics_data.rds'])",items:{type:"string"}}},required:["requiredFiles"]}},execute:async e=>{let s=[],t=!0;for(let i of e.requiredFiles){let o=this.resolvePath(i);if(i.includes("*")){let n=N.dirname(o),a=N.basename(i);try{let r=await W.readdir(n),p="^"+a.replace(/[-/\\^$+?.()|[\]{}]/g,"\\$&").replace(/\\\*/g,".*")+"$",l=new RegExp(p),d=r.filter(c=>l.test(c));if(d.length>0){let c=!1;for(let f of d){let m=await W.stat(N.join(n,f));m.size>0&&(c=!0,s.push(`PASS: ${N.join(N.dirname(i),f)} (size: ${m.size} bytes)`))}c||(s.push(`FAIL: ${i} matched files but all had 0 bytes`),t=!1)}else s.push(`FAIL: ${i} matched 0 files in directory`),t=!1}catch{s.push(`FAIL: Directory for ${i} does not exist`),t=!1}}else try{let n=await W.stat(o);n.size>0?s.push(`PASS: ${i} (size: ${n.size} bytes)`):(s.push(`FAIL: ${i} exists but has 0 bytes`),t=!1)}catch{s.push(`FAIL: ${i} does not exist`),t=!1}}return`Checkpoint Gate Status: ${t?"ALL CHECKPOINTS PASSED":"GATE FAILED"}
${s.join(`
`)}`}}),this.tools.set("complete_phase",{definition:{name:"complete_phase",description:"Signals that the current phase's objectives, code execution, and quality gates have completed successfully.",parameters:{type:"object",properties:{phaseName:{type:"string",description:"The name or filename of the completed phase"},summary:{type:"string",description:"Structured summary of findings, verified outputs, and gate status to update notes.md"}},required:["phaseName","summary"]}},execute:async e=>`PHASE_COMPLETED: ${e.phaseName}
Summary:
${e.summary}`}),this.tools.set("fail_phase",{definition:{name:"fail_phase",description:"Halts execution and marks the current phase as failed when an immutable specification gate, mandatory prerequisite, or unrecoverable error occurs. Use this to exit the phase loop immediately and provide actionable insights for the user to resolve before rerunning.",parameters:{type:"object",properties:{phaseName:{type:"string",description:"The name or filename of the phase (e.g. '00_INSTALL', '01_INSPECT')"},reason:{type:"string",description:"Concise summary of why the phase failed or was halted (e.g. 'Pre-flight Gate Failed: docs/experiment.md contains unconfigured placeholders')"},actionableInsights:{type:"string",description:"Specific, actionable instructions for the researcher explaining what to edit, configure, or verify to resolve the blocker before rerunning the phase."}},required:["phaseName","reason","actionableInsights"]}},execute:async e=>`PHASE_HALTED_FAILED: ${e.phaseName}
Reason: ${e.reason}
Actionable Insights:
${e.actionableInsights}`})}};var O=M(require("path")),K=M(require("fs")),Ne=require("child_process");var fe=class{constructor(e,s,t,i,o){this.literatureService=e;this.client=s;this.extensionPath=t;this.onProgress=i;this.onLog=o}isRunning=!1;shouldAbort=!1;getIsRunning(){return this.isRunning}abort(){this.shouldAbort=!0}ts(){return new Date().toTimeString().split(" ")[0]}async runIngestion(e){if(this.isRunning)throw new Error("An ingestion process is already running.");let s=this.literatureService.getViewState(),t=s.queue;if(t.length===0)throw new Error("No files in the ingestion queue. Select a literature folder first.");let i=this.literatureService.getWorkspaceRoot();if(!i)throw new Error("No active workspace directory set.");let o=s.literatureDir||s.corporaDir||z(i),n=O.join(o,O.basename(e));if(!K.existsSync(n))throw new Error(`Literature database does not exist: ${e}`);this.isRunning=!0,this.shouldAbort=!1;let a=0,r=0;this.onLog(`[${this.ts()}] Literature: Starting batch ingestion of ${t.length} files into ${O.basename(e)}`);try{for(let p=0;p<t.length;p++){if(this.shouldAbort){this.onLog(`[${this.ts()}] Literature: Ingestion aborted by user.`);break}let l=t[p];if(l.stage!=="indexed")try{await this.processItem(l,n,p+1,t.length),a++}catch(d){r++,l.stage="failed",l.message=d.message||String(d),this.literatureService.updateQueueItem(l.id,{stage:"failed",message:l.message}),this.onProgress({item:l,stage:"failed",message:l.message,processedCount:p+1,totalCount:t.length}),this.onLog(`[${this.ts()}] Literature: \u274C Failed to ingest ${l.fileName}: ${l.message}`)}}}finally{this.isRunning=!1,this.shouldAbort=!1,this.literatureService.syncWorkspaceScripts()}if(this.onLog(`[${this.ts()}] Literature: Ingestion batch complete: ${a} indexed, ${r} failed.`),a>0)try{this.onLog(`[${this.ts()}] Literature: Updating database accounting report (docs/literature_database.md)...`),await this.literatureService.generateReport(O.basename(e)),this.onLog(`[${this.ts()}] Literature: \u2713 Updated docs/literature_database.md`)}catch(p){this.onLog(`[${this.ts()}] Literature: Notice: could not auto-update report: ${p.message}`)}return{success:r===0,processed:a,errors:r}}async processItem(e,s,t,i){let o=(g,w)=>{e.stage=g,e.message=w,this.literatureService.updateQueueItem(e.id,{stage:g,message:w}),this.onProgress({item:e,stage:g,message:w,processedCount:t,totalCount:i})};o("parsing_pdf","Extracting text and tables..."),this.onLog(`[${this.ts()}] Literature: [${t}/${i}] Parsing ${e.fileName}...`);let n=this.findScript("extract_text_or_table.R"),a=this.literatureService.resolveRscript(),r=await this.execRJson(a,n,[e.absPath,"25"]);if(!r.ok)throw new Error(r.error||"Failed to extract text from file.");o("llm_extraction","LLM structured extraction..."),this.onLog(`[${this.ts()}] Literature: [${t}/${i}] Extracting assertions from ${e.fileName}...`);let p=`doi_${O.basename(e.fileName,O.extname(e.fileName))}`,l=null;if(r.kind==="pdf"?l=await this.llmExtractFromPdfText(e.fileName,r.text):l=await this.llmExtractFromTable(e.fileName,r.columns,r.rows),!l||!l.study)throw new Error("LLM failed to return structured extraction payload.");l.db_path=s,l.study&&l.study.study_id?p=l.study.study_id:l.study.study_id=p,l.study.filename=e.fileName,o("normalization","Normalizing symbols and orthologs..."),this.onLog(`[${this.ts()}] Literature: [${t}/${i}] Normalizing symbols via R (limma/babelgene)...`);let d;try{d=this.findScript("normalize_and_insert_literature.R")}catch{d=this.findScript("normalize_and_insert_corpus.R")}let c=this.literatureService.getWorkspaceRoot(),f=z(c);K.mkdirSync(f,{recursive:!0});let m=O.join(f,`_tmp_ingest_${Date.now()}.json`);try{K.writeFileSync(m,JSON.stringify(l,null,2),"utf-8");let g=await this.execRJson(a,d,[m,s]);if(!g.ok)throw new Error(g.error||"Normalization and insertion failed in R.");(g.assertions_inserted||0)===0?(o("indexed","Indexed 0 assertions (no explicit protein relationships found)"),this.onLog(`[${this.ts()}] Literature: Warning: 0 assertions extracted from ${e.fileName}. Check if document contains explicit protein interactions or is a conceptual overview.`)):(o("indexed",`Indexed ${g.assertions_inserted} assertions (${g.symbols_normalized||0} normalized)`),this.onLog(`[${this.ts()}] Literature: \u2713 [${t}/${i}] Indexed ${e.fileName}: ${g.assertions_inserted} assertions into DuckDB.`))}finally{try{K.existsSync(m)&&K.unlinkSync(m)}catch{}}}async llmExtractFromPdfText(e,s){let t=`You are an expert molecular biologist, biochemist, and biocuration specialist.
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
${s.slice(0,5e4)}

Extract all studies, contexts, and molecular assertions.`,o=await this.client.chat({system:t,messages:[{role:"user",content:i}],tools:[]});return this.cleanAndParseJson(o.content)}async llmExtractFromTable(e,s,t){let i=`You are a biocuration specialist. Convert a supplementary proteomics/genomics table into structured assertions.
Return ONLY valid JSON with { "study": {...}, "experimental_contexts": [...], "molecular_assertions": [...] }.`,o=`Table Filename: ${e}
Columns: ${s.join(", ")}
Top Data Rows (JSON):
${JSON.stringify(t.slice(0,40),null,2)}

Extract the study, context, and all molecular assertions with raw_entity_name and relationship_type.`,n=await this.client.chat({system:i,messages:[{role:"user",content:o}],tools:[]});return this.cleanAndParseJson(n.content)}cleanAndParseJson(e){let s=(e||"").trim();s.startsWith("```json")?s=s.slice(7):s.startsWith("```")&&(s=s.slice(3)),s.endsWith("```")&&(s=s.slice(0,-3)),s=s.trim();let t=s.indexOf("{"),i=s.lastIndexOf("}");return t!==-1&&i!==-1&&(s=s.substring(t,i+1)),JSON.parse(s)}findScript(e){let t=[O.join(this.extensionPath,"templates","shared","tools","literature",e),O.join(this.extensionPath,"extension","templates","shared","tools","literature",e),O.join(__dirname,"..","templates","shared","tools","literature",e),O.join(__dirname,"..","..","templates","shared","tools","literature",e),O.join(this.extensionPath,"templates","shared","tools","corpus",e),O.join(this.extensionPath,"extension","templates","shared","tools","corpus",e),O.join(__dirname,"..","templates","shared","tools","corpus",e),O.join(__dirname,"..","..","templates","shared","tools","corpus",e)].find(i=>K.existsSync(i));if(t)return t;throw new Error(`Literature script '${e}' not found in extension templates.`)}execRJson(e,s,t){return new Promise(i=>{(0,Ne.execFile)(e,[s,...t],{timeout:9e4,maxBuffer:15*1024*1024},(o,n,a)=>{let p=String(n||"").split(/\r?\n/).find(d=>d.startsWith("@@LITERATURE_JSON@@")||d.startsWith("@@CORPUS_JSON@@"));if(p)try{let d=p.startsWith("@@LITERATURE_JSON@@")?"@@LITERATURE_JSON@@":"@@CORPUS_JSON@@";i(JSON.parse(p.slice(d.length)));return}catch(d){i({ok:!1,error:`JSON parse error: ${d.message}`,stderr:a});return}let l=String(a||o?.message||"").trim();i({ok:!1,error:l||"R process finished without output.",stderr:a})})})}};var Q=M(require("fs/promises")),Te=M(require("fs")),q=M(require("path"));var U=M(require("fs/promises")),oe=M(require("fs")),ne=M(require("path")),ve=class{constructor(e,s){this.workspaceRoot=e;this.extensionUriPath=s}setWorkspaceRoot(e){this.workspaceRoot=e||""}getExperimentPath(){return ne.join(this.workspaceRoot,"docs","experiment.md")}async ensureExperimentDoc(){let e=this.getExperimentPath();if(oe.existsSync(e))return await U.readFile(e,"utf-8");let s=ne.dirname(e);oe.existsSync(s)||await U.mkdir(s,{recursive:!0});let t="";if(this.extensionUriPath){let i=ne.join(this.extensionUriPath,"templates","shared","docs","experiment.md");oe.existsSync(i)&&(t=await U.readFile(i,"utf-8"))}return t||(t=`# Experiment & Dataset Specification

## 1. Input Dataset Parameters
\u{1F449} [USER ACTION REQUIRED - CONFIGURE DATASET PARAMETERS]:

- **PATH_TO_DATA_FILE**: [REQUIRED: Enter URL or relative path to data file]
- **PLATFORM**: [REQUIRED: Enter search platform]
- **ANALYTE**: [REQUIRED: proteins or peptides]

## 2. Experimental Hypothesis & Study Design
\u{1F449} [USER ACTION REQUIRED - DESCRIBE STUDY & HYPOTHESIS]:

[REQUIRED: Describe the experimental hypothesis, biological system, treatment conditions, control groups, and key biological questions to investigate.]

## 3. Sample Grouping, Recoding & Contrast Designations

### A. Discovered Sample Groups in Dataset:
\u2139\uFE0F [AUTO-GENERATED REFERENCE - READ ONLY]:
- *(Pending Phase 1 data ingestion)*

### B. Sample Group Renaming & Pooling Map (Optional):
\u{1F449} [USER REVIEW & EDIT TABLE]:
| Raw Sample Group | Cleaned Group Name |
| :--- | :--- |

\u{1F449} [USER TOGGLE]:
- **Reassign Sample Names According to Pooling Map**: TRUE

### C. Target Contrasts:
\u{1F449} [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:
- Contrast: <treatment> vs <control>

### D. Confounded Batch & Exploratory Comparison Authorization:
\u26A0\uFE0F [PRE-FLIGHT GATE DECISION]:
- **Proceed With Potential Batch Confounding**: FALSE
`),await U.writeFile(e,t,"utf-8"),t}async readSpec(){let e=this.getExperimentPath();if(!oe.existsSync(e))return{exists:!1,pathToDataFile:null,platform:null,analyte:null,description:null,rawSampleGroups:[],sampleRenamingMap:{},targetContrasts:[],batchConfoundingAuthorized:!1,missingInitialFields:["PATH_TO_DATA_FILE","PLATFORM","ANALYTE","DESCRIPTION"]};let s=await U.readFile(e,"utf-8"),t=[],i=null,o=s.match(/-\s*\*\*PATH_TO_DATA_FILE\*\*:\s*(.*)/i);if(o){let y=o[1].trim();y&&!y.includes("[REQUIRED")&&!y.startsWith("<")&&!y.includes("Enter URL")&&(i=y)}i||t.push("PATH_TO_DATA_FILE");let n=null,a=s.match(/-\s*\*\*PLATFORM\*\*:\s*(.*)/i);if(a){let y=a[1].trim();y&&!y.includes("[REQUIRED")&&!y.startsWith("<")&&!y.includes("Enter search platform")&&(n=y)}n||t.push("PLATFORM");let r=null,p=s.match(/-\s*\*\*ANALYTE\*\*:\s*(.*)/i);if(p){let y=p[1].trim();y&&!y.includes("[REQUIRED")&&!y.startsWith("<")&&!y.includes("proteins or peptides")&&(r=y)}r||t.push("ANALYTE");let l=null,d=s.match(/## 2\. Experimental Hypothesis & Study Design[\s\S]*?(?=## 3\.|$)/i);if(d){let S=d[0].replace(/## 2\. Experimental Hypothesis & Study Design/i,"").replace(/👉\s*\[USER ACTION REQUIRED[^\]]*\]:/gi,"").replace(/<!--[\s\S]*?-->/g,"").trim();S&&!S.includes("[REQUIRED")&&S.length>=10&&(l=S)}l||t.push("DESCRIPTION");let c=[],f=s.matchAll(/-\s*Contrast:\s*(.*)/gi);for(let y of f){let S=y[1].trim();S&&!S.includes("<treatment>")&&!S.includes("<control>")&&!S.includes("[REQUIRED")&&c.push(S)}let m={},g=s.match(/\| Raw Sample Group \| Cleaned Group Name \|\s*\n\| :--- \| :--- \|\s*\n([\s\S]*?)(?=\n\s*(?:👉|###|##|$))/i);if(g){let y=g[1].split(`
`).map(S=>S.trim()).filter(S=>S.startsWith("|"));for(let S of y){let R=S.split("|").map(F=>F.trim()).filter(Boolean);R.length>=2&&R[0]!=="Raw Sample Group"&&!R[0].includes("---")&&(m[R[0]]=R[1])}}let w=/-\s*\*\*Proceed With Potential Batch Confounding\*\*:\s*TRUE/i.test(s);return{exists:!0,pathToDataFile:i,platform:n,analyte:r,description:l,rawSampleGroups:[],sampleRenamingMap:m,targetContrasts:c,batchConfoundingAuthorized:w,missingInitialFields:t}}async setParameter(e,s){await this.ensureExperimentDoc();let t=this.getExperimentPath(),i=await U.readFile(t,"utf-8"),o=new RegExp(`(-\\s*\\*\\*${e}\\*\\*:\\s*)(.*)`,"i");o.test(i)?i=i.replace(o,`$1${s.trim()}`):i=i.replace(/(## 1\. Input Dataset Parameters[\s\S]*?)(?=## 2\.|$)/i,`$1
- **${e}**: ${s.trim()}
`),await U.writeFile(t,i,"utf-8")}async setDescription(e){await this.ensureExperimentDoc();let s=this.getExperimentPath(),t=await U.readFile(s,"utf-8"),i=/(## 2\. Experimental Hypothesis & Study Design[\s\S]*?)(?=## 3\.|$)/i,o=`## 2. Experimental Hypothesis & Study Design
\u{1F449} [USER ACTION REQUIRED - DESCRIBE STUDY & HYPOTHESIS]:

${e.trim()}

`;i.test(t)?t=t.replace(i,o):t+=`

${o}`,await U.writeFile(s,t,"utf-8")}async setSampleRenamingMap(e){await this.ensureExperimentDoc();let s=this.getExperimentPath(),t=await U.readFile(s,"utf-8"),i=`| Raw Sample Group | Cleaned Group Name |
| :--- | :--- |
`;for(let[n,a]of Object.entries(e))i+=`| ${n} | ${a} |
`;let o=/(### B\. Sample Group Renaming & Pooling Map[\s\S]*?)(?:\| Raw Sample Group \| Cleaned Group Name \|[\s\S]*?(?=\n\s*(?:👉|###|##|$)))/i;if(o.test(t))t=t.replace(o,`$1${i}`);else{let n=/(### B\. Sample Group Renaming & Pooling Map[\s\S]*?)(?=### C\.|$)/i;n.test(t)&&(t=t.replace(n,`### B. Sample Group Renaming & Pooling Map (Optional):
\u{1F449} [USER REVIEW & EDIT TABLE]:
${i}
\u{1F449} [USER TOGGLE]:
- **Reassign Sample Names According to Pooling Map**: TRUE

`))}t=t.replace(/-\s*\*\*Reassign Sample Names According to (?:Sample Group Renaming & )?Pooling Map\*\*:\s*FALSE/i,"- **Reassign Sample Names According to Pooling Map**: TRUE"),await U.writeFile(s,t,"utf-8")}async setTargetContrasts(e){await this.ensureExperimentDoc();let s=this.getExperimentPath(),t=await U.readFile(s,"utf-8"),i=e.map(a=>`- Contrast: ${a.replace(/^-\s*Contrast:\s*/i,"").trim()}`).join(`
`),o=/(### C\. Target Contrasts:[\s\S]*?)(?=### D\.|$)/i,n=`### C. Target Contrasts:
\u{1F449} [USER ACTION REQUIRED - DEFINE TARGET CONTRASTS]:
${i}

`;o.test(t)?t=t.replace(o,n):t+=`

${n}`,await U.writeFile(s,t,"utf-8")}async setBatchConfounding(e){await this.ensureExperimentDoc();let s=this.getExperimentPath(),t=await U.readFile(s,"utf-8"),i=e?"TRUE":"FALSE";t.includes("Proceed With Potential Batch Confounding")?t=t.replace(/(-\s*\*\*Proceed With Potential Batch Confounding\*\*:\s*)(TRUE|FALSE)/i,`$1${i}`):t+=`

### D. Confounded Batch & Exploratory Comparison Authorization:
- **Proceed With Potential Batch Confounding**: ${i}
`,await U.writeFile(s,t,"utf-8")}};var ye=class{constructor(e,s,t,i,o,n){this.workspaceRoot=e;this.client=s;this.getPipelineState=t;this.onStartPipeline=i;this.onAdvisorUpdated=o;this.workspaceRoot=e||"",this.experimentManager=new ve(this.workspaceRoot,n)}messages=[];isBusy=!1;abortRequested=!1;experimentManager;lastHaltedPhaseId;setWorkspaceRoot(e){this.workspaceRoot=e||"",this.experimentManager.setWorkspaceRoot(this.workspaceRoot)}getExperimentManager(){return this.experimentManager}getMessages(){return[...this.messages]}isRunning(){return this.isBusy}cancel(){this.isBusy&&(this.abortRequested=!0)}async clearMessages(){this.messages=[]}async readFileSafe(e){try{if(!this.workspaceRoot)return"";let s=q.isAbsolute(e)?e:q.join(this.workspaceRoot,e);return await Q.readFile(s,"utf-8")}catch{return""}}getAdvisorTools(){return[{name:"update_experiment_parameters",description:"Updates Section 1 of docs/experiment.md with the dataset file path, search platform, or analyte.",parameters:{type:"object",properties:{pathToDataFile:{type:"string",description:"Filesystem path or HTTP/HTTPS URL to the dataset file (e.g. data/raw/tmt_proteins.xlsx or data/raw/tidyproteomics_data.rds)"},platform:{type:"string",description:"Search platform or data type: ProteomeDiscoverer, MaxQuant, DIA-NN, Spectronaut, FragPipe, or tidyproteomics / rds"},analyte:{type:"string",description:"Type of analyte measured: 'proteins' or 'peptides'"}},required:[]}},{name:"update_experiment_description",description:"Updates Section 2 of docs/experiment.md with the study hypothesis, biological model, treatment/control conditions, and key questions.",parameters:{type:"object",properties:{description:{type:"string",description:"Comprehensive scientific hypothesis and experiment design description"}},required:["description"]}},{name:"update_sample_renaming",description:"Updates Section 3B of docs/experiment.md to pool or rename raw sample groups into clean biological cohorts (e.g. mapping batch tags into clean treatment/control groups).",parameters:{type:"object",properties:{sampleMapping:{type:"object",description:"Key-value dictionary mapping raw sample group names to cleaned group names, e.g. { 'active_batch5': 'active', 'healthy_batch8': 'healthy' }"}},required:["sampleMapping"]}},{name:"update_target_contrasts",description:"Updates Section 3C of docs/experiment.md with pairwise contrast comparisons (e.g. ['Disease vs Control']).",parameters:{type:"object",properties:{contrasts:{type:"array",items:{type:"string"},description:"Array of pairwise contrasts, e.g. ['Disease vs Control'] or ['Treated vs Untreated']"}},required:["contrasts"]}},{name:"authorize_batch_confounding",description:"Updates Section 3D of docs/experiment.md to authorize Proceed With Potential Batch Confounding (TRUE or FALSE).",parameters:{type:"object",properties:{authorized:{type:"boolean",description:"Whether to authorize proceeding with unadjusted exploratory comparison despite batch confounding"}},required:["authorized"]}},{name:"start_or_resume_pipeline",description:"Triggers or resumes execution of the autonomous analysis pipeline when initial configuration is satisfied or when a halted phase's questions have been resolved.",parameters:{type:"object",properties:{phaseId:{type:"string",description:"Optional specific phase ID to rerun/resume, or omit to run the full pipeline"},reason:{type:"string",description:"Reason why the pipeline is starting or resuming"}},required:["reason"]}}]}async checkAndTriggerOnboarding(){if(!this.workspaceRoot)return!1;let e=await this.experimentManager.readSpec();if(e.missingInitialFields.length>0){if(this.messages.length===0){let s=e.missingInitialFields[0],t="",i=[];return s==="PATH_TO_DATA_FILE"?(t="\u{1F44B} **Welcome to TidyProteomicsAgent!**\n\nI am your **Live Advisor**. Before starting the pipeline, let's configure your experiment.\n\n\u{1F449} **Question 1/4**: What is the file path or URL to your proteomics data file? *(e.g. `data/raw/ProteomeDiscoverer_proteins.xlsx` or `data/raw/data.rds`)*",i=["data/raw/tidyproteomics_data.rds","Select File..."]):s==="PLATFORM"?(t="\u{1F449} **Question 2/4**: Which mass spectrometry search platform generated this data?",i=["ProteomeDiscoverer","MaxQuant","DIA-NN","Spectronaut","FragPipe","tidyproteomics"]):s==="ANALYTE"?(t="\u{1F449} **Question 3/4**: Is this dataset measuring `proteins` or `peptides`?",i=["proteins","peptides"]):s==="DESCRIPTION"&&(t="\u{1F449} **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key hypotheses)*"),this.messages.push({id:"msg_onboard_"+Date.now(),role:"assistant",content:t,timestamp:new Date().toLocaleTimeString(),quickChips:i}),this.onAdvisorUpdated&&this.onAdvisorUpdated(),!0}}else if(this.messages.length===0)return this.messages.push({id:"msg_ready_"+Date.now(),role:"assistant",content:`\u{1F44B} **Welcome back to TidyProteomicsAgent!**

I reviewed \`docs/experiment.md\` and confirmed that all initial dataset parameters and your experiment description are configured! \u{1F680}

**Ready to start the autonomous analysis pipeline?**`,timestamp:new Date().toLocaleTimeString(),quickChips:["\u26A1 Yes, Start Pipeline","Review docs/experiment.md \u2197"]}),this.onAdvisorUpdated&&this.onAdvisorUpdated(),!0;return!1}async handlePhaseHalted(e){let s=`msg_halt_${e.id}`;if(this.lastHaltedPhaseId===e.id&&this.messages.some(p=>p.id===s))return;this.lastHaltedPhaseId=e.id;let t=String(e.error||e.summary||"").trim(),i="",o=[],n=/confound|Proceed With Potential Batch Confounding|Authorize Unadjusted Exploratory Comparison/i.test(t),a=/sample group|recoding|pooling|Section 3\.?B|reassign sample names/i.test(t),r=/contrast|target contrast|disease\/control|Section 3\.?C/i.test(t);if(n)i=`\u26A0\uFE0F **Batch Confounding Alert in ${e.title||e.fileName}**

The pipeline detected that biological conditions are correlated with technical processing batches. Linear models cannot mathematically separate batch variance from biology.

**Would you like to authorize an exploratory comparison despite potential batch confounding?**`,o=["\u26A1 Authorize Confounding & Resume","No, do not proceed"];else if(a)i=`\u{1F9EA} **Sample Renaming & Grouping Required in ${e.title||e.fileName}**

The ingested dataset contains raw sample names with technical batch tags. How would you like to rename or group these samples? *(e.g., which samples are \`Control\` and which are \`Disease\`?)*`,o=["Review docs/experiment.md \u2197"];else if(r)i=`\u{1F3AF} **Target Contrast Required in ${e.title||e.fileName}**

Before calculating differential expression, what comparison would you like to test? *(e.g., \`Disease vs Control\` or \`Treated vs Vehicle\`)*`,o=["Disease vs Control","Treatment vs Control"];else{let p=t.split(`
`)[0]||"Phase paused.";i=`\u26A0\uFE0F **Pipeline Paused in ${e.title||e.fileName}**

${p}

How would you like to resolve this? Tell me what changes to make in \`docs/experiment.md\` or ask for advice.`,o=["What caused this?","Check docs/experiment.md \u2197"]}this.messages.push({id:s,role:"assistant",content:i,timestamp:new Date().toLocaleTimeString(),quickChips:o}),this.onAdvisorUpdated&&this.onAdvisorUpdated()}async buildSystemPrompt(){let e=await this.readFileSafe(q.join("docs","experiment.md")),s=await this.readFileSafe(q.join("docs","notes.md")),t=await this.readFileSafe(q.join("docs","llm.md")),i=await this.readFileSafe(q.join("agent","TIDYPROTEOMICS_IMPORT_INSPECT.md"));i||(i=await this.readFileSafe(q.join("agent","TIDYPROTEOMICS_CORE.md")));let o="No pipeline state available.";if(this.getPipelineState)try{let a=await this.getPipelineState();a&&Array.isArray(a.phases)&&a.phases.length>0&&(o=a.phases.map((r,p)=>{let l=(r.status||"pending").toUpperCase(),d=`${p+1}. [${l}] ${r.title||r.fileName}`;return r.durationSeconds&&(d+=` (${r.durationSeconds}s)`),r.error&&(d+=`
   Error/Warning: ${r.error.slice(0,300)}`),d}).join(`
`))}catch(a){o=`Error fetching pipeline state: ${String(a)}`}let n=await this.experimentManager.readSpec();return`
You are the **TidyProteomics Live Advisor**, an expert AI computational biologist and mass spectrometry proteomics specialist integrated directly inside VS Code.
You drive the research workflow interactively: you interview the researcher, configure \`docs/experiment.md\` using your tools, answer scientific questions, resolve batch confounding or contrast ambiguities, and start/resume the pipeline.

### CURRENT WORKSPACE STATE & SPECIFICATION:
- **Missing Initial Variables**: ${n.missingInitialFields.join(", ")||"None (All 4 initialized)"}
- **Data File**: ${n.pathToDataFile||"Unset"}
- **Platform**: ${n.platform||"Unset"}
- **Analyte**: ${n.analyte||"Unset"}
- **Contrasts**: ${n.targetContrasts.join(", ")||"None defined"}
- **Batch Confounding Authorized**: ${n.batchConfoundingAuthorized?"TRUE":"FALSE"}

#### Active Pipeline Tasks:
\`\`\`text
${o}
\`\`\`

#### Experimental Specification (docs/experiment.md):
\`\`\`markdown
${e||"No docs/experiment.md found."}
\`\`\`

#### Runtime Shared Notes (docs/notes.md):
\`\`\`markdown
${s?s.slice(-3e3):"No runtime notes found."}
\`\`\`

#### Active Model Info (docs/llm.md):
\`\`\`markdown
${t||"Not specified."}
\`\`\`

${i?`#### TidyProteomics Key API Reference:
${i.slice(0,2500)}
`:""}

### ADVISOR RESPONSIBILITIES & TOOL CALLING:
1. **Interactive Setup**: If initial variables are missing, guide the user step-by-step. When the user provides a dataset path, platform, analyte, or description, invoke the corresponding tool (\`update_experiment_parameters\` or \`update_experiment_description\`) to update \`docs/experiment.md\` immediately!
2. **Launch Permission**: When all 4 initial fields are satisfied, ask the user if they are ready to start. When they confirm (e.g. "yes", "start", "proceed"), call \`start_or_resume_pipeline\`.
3. **Resolve Phase Errors**:
   - If user specifies sample group renaming or pooling, call \`update_sample_renaming\` and resume the pipeline!
   - If user specifies target contrasts (e.g. "disease/control" or "test cancer vs normal"), call \`update_target_contrasts\` and resume the pipeline!
   - If user agrees to proceed despite batch confounding, call \`authorize_batch_confounding(authorized = true)\` and resume the pipeline!
4. **Direct, Clear Explanations**: When calling tools, explain clearly to the user what was saved to \`docs/experiment.md\` and what happens next.
`.trim()}async sendMessage(e,s){if(this.isBusy)throw new Error("Advisor is already generating a response.");this.isBusy=!0,this.abortRequested=!1;let t="msg_"+Date.now()+"_u",i=new Date().toLocaleTimeString();this.messages.push({id:t,role:"user",content:e,timestamp:i}),this.onAdvisorUpdated&&this.onAdvisorUpdated(),console.log("[AdvisorService] Received user query:",e);try{let o=e.trim(),n=o.toLowerCase(),a=/^(yes|start|run|proceed|ready|start pipeline|run pipeline|yes,? start pipeline|⚡ yes, start pipeline)$/i.test(n),r=/^(authorize|authorize and resume|authorize confounding|yes,? authorize|yes,? proceed|⚡ authorize confounding & resume)$/i.test(n),p=await this.experimentManager.readSpec();if(p.missingInitialFields.length>0){let T=p.missingInitialFields[0],D="",j=[];if(T==="PATH_TO_DATA_FILE"?(console.log("[AdvisorService] Saving PATH_TO_DATA_FILE:",o),await this.experimentManager.setParameter("PATH_TO_DATA_FILE",o),D=`\u2705 **Saved Data File**: Configured \`PATH_TO_DATA_FILE: ${o}\` in \`docs/experiment.md\`.

\u{1F449} **Question 2/4**: Which mass spectrometry search platform generated this data?`,j=["ProteomeDiscoverer","MaxQuant","DIA-NN","Spectronaut","FragPipe","tidyproteomics"]):T==="PLATFORM"?(console.log("[AdvisorService] Saving PLATFORM:",o),await this.experimentManager.setParameter("PLATFORM",o),D=`\u2705 **Saved Search Platform**: Configured \`PLATFORM: ${o}\` in \`docs/experiment.md\`.

\u{1F449} **Question 3/4**: Is this dataset measuring \`proteins\` or \`peptides\`?`,j=["proteins","peptides"]):T==="ANALYTE"?(console.log("[AdvisorService] Saving ANALYTE:",o),await this.experimentManager.setParameter("ANALYTE",o),D=`\u2705 **Saved Analyte**: Configured \`ANALYTE: ${o}\` in \`docs/experiment.md\`.

\u{1F449} **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key hypotheses)*`):T==="DESCRIPTION"&&(console.log("[AdvisorService] Saving DESCRIPTION"),await this.experimentManager.setDescription(o),D=`\u2705 **Saved Experiment Description**: Updated Section 2 in \`docs/experiment.md\`.

\u{1F389} **All dataset parameters and study description are now configured!** \u{1F680}

**Ready to start the autonomous analysis pipeline?**`,j=["\u26A1 Yes, Start Pipeline","Review docs/experiment.md \u2197"]),D){s&&s(D);let Y={id:"msg_"+Date.now()+"_a",role:"assistant",content:D,timestamp:new Date().toLocaleTimeString(),quickChips:j.length>0?j:void 0};return this.messages.push(Y),await this.logAdvisorTurn(e,D),this.onAdvisorUpdated&&this.onAdvisorUpdated(),{reply:D,usage:{promptTokens:0,completionTokens:0,totalTokens:0}}}}if(this.lastHaltedPhaseId){if(r){await this.experimentManager.setBatchConfounding(!0);let D="\u2705 **Authorized Batch Confounding**: Updated `docs/experiment.md` (`Proceed With Potential Batch Confounding: TRUE`).\n\nResuming the pipeline now...";s&&s(D);let j={id:"msg_"+Date.now()+"_a",role:"assistant",content:D,timestamp:new Date().toLocaleTimeString()};this.messages.push(j);let Y=this.lastHaltedPhaseId;return this.lastHaltedPhaseId=void 0,this.onStartPipeline&&await this.onStartPipeline(Y),await this.logAdvisorTurn(e,D),this.onAdvisorUpdated&&this.onAdvisorUpdated(),{reply:D,usage:{promptTokens:0,completionTokens:0,totalTokens:0}}}let T=o.match(/^([a-zA-Z0-9_-]+)\s*(?:\/|vs\.?|versus)\s*([a-zA-Z0-9_-]+)$/i);if(T){let D=`${T[1]} vs ${T[2]}`;await this.experimentManager.setTargetContrasts([D]);let j=`\u2705 **Configured Target Contrast**: Saved \`- Contrast: ${D}\` in \`docs/experiment.md\`.

Resuming differential expression analysis now...`;s&&s(j);let Y={id:"msg_"+Date.now()+"_a",role:"assistant",content:j,timestamp:new Date().toLocaleTimeString()};this.messages.push(Y);let be=this.lastHaltedPhaseId;return this.lastHaltedPhaseId=void 0,this.onStartPipeline&&await this.onStartPipeline(be),await this.logAdvisorTurn(e,j),this.onAdvisorUpdated&&this.onAdvisorUpdated(),{reply:j,usage:{promptTokens:0,completionTokens:0,totalTokens:0}}}}if(a&&(await this.experimentManager.readSpec()).missingInitialFields.length===0){let D=this.client.getConfig();if(D.provider!=="ollama"&&!D.apiKey){let we="\u26A0\uFE0F **API Key Required**: Please configure an API Key in the **Provider** tab before launching the autonomous pipeline.";s&&s(we);let Fe={id:"msg_"+Date.now()+"_a",role:"assistant",content:we,timestamp:new Date().toLocaleTimeString(),quickChips:["Switch to Provider Tab \u2197"]};return this.messages.push(Fe),this.onAdvisorUpdated&&this.onAdvisorUpdated(),{reply:we,usage:{promptTokens:0,completionTokens:0,totalTokens:0}}}let j="\u{1F680} **Starting Pipeline Execution**: Everything in `docs/experiment.md` is verified. Triggering the autonomous analysis pipeline now!";s&&s(j);let Y={id:"msg_"+Date.now()+"_a",role:"assistant",content:j,timestamp:new Date().toLocaleTimeString()};this.messages.push(Y);let be=this.lastHaltedPhaseId;return this.lastHaltedPhaseId=void 0,this.onStartPipeline&&await this.onStartPipeline(be),await this.logAdvisorTurn(e,j),this.onAdvisorUpdated&&this.onAdvisorUpdated(),{reply:j,usage:{promptTokens:0,completionTokens:0,totalTokens:0}}}let l=this.client.getConfig();if(l.provider!=="ollama"&&!l.apiKey){let T="\u26A0\uFE0F **API Key Required**: To chat with the Live Advisor on open-ended scientific topics, please configure an API Key in the **Provider** tab.";s&&s(T);let D={id:"msg_"+Date.now()+"_a",role:"assistant",content:T,timestamp:new Date().toLocaleTimeString(),quickChips:["Switch to Provider Tab \u2197"]};return this.messages.push(D),await this.logAdvisorTurn(e,T),this.onAdvisorUpdated&&this.onAdvisorUpdated(),{reply:T,usage:{promptTokens:0,completionTokens:0,totalTokens:0}}}let d=await this.buildSystemPrompt(),f=this.messages.slice(-16).map(T=>({role:T.role,content:T.content})),m="",g=this.getAdvisorTools();console.log(`[AdvisorService] Sending query to ${l.provider} (${l.model})...`);let w=await this.client.chat({system:d,messages:f,tools:g,onToken:T=>{this.abortRequested||(m+=T,s&&s(T))}}),y="",S=!1,R=this.lastHaltedPhaseId;if(w.tool_calls&&w.tool_calls.length>0)for(let T of w.tool_calls)try{switch(T.name){case"update_experiment_parameters":{T.args?.pathToDataFile&&(await this.experimentManager.setParameter("PATH_TO_DATA_FILE",T.args.pathToDataFile),y+=`
\u2022 Updated \`PATH_TO_DATA_FILE\` to \`${T.args.pathToDataFile}\``),T.args?.platform&&(await this.experimentManager.setParameter("PLATFORM",T.args.platform),y+=`
\u2022 Updated \`PLATFORM\` to \`${T.args.platform}\``),T.args?.analyte&&(await this.experimentManager.setParameter("ANALYTE",T.args.analyte),y+=`
\u2022 Updated \`ANALYTE\` to \`${T.args.analyte}\``);break}case"update_experiment_description":{T.args?.description&&(await this.experimentManager.setDescription(T.args.description),y+=`
\u2022 Updated Section 2 Experimental Hypothesis & Study Design`);break}case"update_sample_renaming":{T.args?.sampleMapping&&(await this.experimentManager.setSampleRenamingMap(T.args.sampleMapping),y+=`
\u2022 Configured Sample Group Renaming & Pooling Map in Section 3B`,S=!0);break}case"update_target_contrasts":{Array.isArray(T.args?.contrasts)&&T.args.contrasts.length>0&&(await this.experimentManager.setTargetContrasts(T.args.contrasts),y+=`
\u2022 Configured Target Contrasts: ${T.args.contrasts.join(", ")}`,S=!0);break}case"authorize_batch_confounding":{await this.experimentManager.setBatchConfounding(T.args?.authorized!==!1),y+=`
\u2022 Set Proceed With Potential Batch Confounding to \`${T.args?.authorized!==!1?"TRUE":"FALSE"}\``,S=!0;break}case"start_or_resume_pipeline":{S=!0,T.args?.phaseId&&(R=T.args.phaseId),y+=`
\u2022 Triggering pipeline execution (${T.args?.reason||"User confirmed"})`;break}}}catch(D){console.error(`[AdvisorService] Error executing tool ${T.name}:`,D)}let F=await this.experimentManager.readSpec(),u="",E=[];if(F.missingInitialFields.length>0){let T=F.missingInitialFields[0];T==="PLATFORM"?(u=`

\u{1F449} **Question 2/4**: Which mass spectrometry search platform generated this data?`,E=["ProteomeDiscoverer","MaxQuant","DIA-NN","Spectronaut","FragPipe","tidyproteomics"]):T==="ANALYTE"?(u="\n\n\u{1F449} **Question 3/4**: Is this dataset measuring `proteins` or `peptides`?",E=["proteins","peptides"]):T==="DESCRIPTION"&&(u=`

\u{1F449} **Question 4/4**: Could you briefly describe this experiment? *(e.g. biological model, treatment conditions, disease vs control groups, and key questions)*`)}else y&&!S&&(u=`

\u{1F389} **All dataset parameters and study description are set up in \`docs/experiment.md\`!**

Are you ready to start the autonomous analysis pipeline?`,E=["\u26A1 Yes, Start Pipeline","Review docs/experiment.md \u2197"]);let P=m;!P&&w.content&&(P=w.content),y&&!P.includes("docs/experiment.md")&&(P=(P?P+`

`:"")+`\u{1F4BE} **Updated \`docs/experiment.md\`:**${y}`),u&&!P.includes("Question")&&(P+=u),this.abortRequested&&(P+=`

*(Advisor response cancelled by user)*`);let C="msg_"+Date.now()+"_a",$=new Date().toLocaleTimeString(),H={id:C,role:"assistant",content:P,timestamp:$,quickChips:E.length>0?E:void 0};return this.messages.push(H),await this.logAdvisorTurn(e,P,w.usage),S&&this.onStartPipeline&&(this.lastHaltedPhaseId=void 0,this.onStartPipeline(R).catch(T=>{console.error("[AdvisorService] Error running pipeline after advisor resolution:",T)})),this.onAdvisorUpdated&&this.onAdvisorUpdated(),{reply:P,usage:w.usage}}finally{this.isBusy=!1,this.abortRequested=!1}}async logAdvisorTurn(e,s,t){if(this.workspaceRoot)try{let i=q.join(this.workspaceRoot,"logs","advisor");Te.existsSync(i)||await Q.mkdir(i,{recursive:!0});let o=q.join(i,"chat.md"),n=new Date().toISOString(),a=t?` *(Tokens: ${t.totalTokens||0})*`:"",r=`

### [${n}] User:
${e}

### [${n}] Advisor${a}:
${s}

---
`;Te.existsSync(o)?await Q.appendFile(o,r,"utf-8"):await Q.writeFile(o,`# TidyProteomics Live Advisor Chat Trace

This log records consultative dialogues between the user and the TidyProteomics Live Advisor.

---
`+r,"utf-8")}catch(i){console.error("[AdvisorService] Error logging advisor turn:",i)}}};var ae=class{constructor(e,s){this._extensionUri=e;this.context=s;this.workspaceRoot=this.getActiveWorkspaceRoot(),this.literatureService=new le(this.workspaceRoot,this._extensionUri.fsPath,()=>h.workspace.getConfiguration("tidyproteomicsagent").get("rscriptPath")),this.corpusService=this.literatureService;let t=h.workspace.getConfiguration("tidyproteomicsagent"),i=t.get("baseUrl")||s.globalState.get("tidyproteomicsagent.baseUrl")||"",o=t.get("provider")||s.globalState.get("tidyproteomicsagent.provider")||"anthropic",n=t.get("model")||s.globalState.get("tidyproteomicsagent.model")||"claude-3-7-sonnet-20250219",a=t.get("maxTokens")||s.globalState.get("tidyproteomicsagent.maxTokens")||32768,r=t.get("timeoutSeconds")||s.globalState.get("tidyproteomicsagent.timeoutSeconds")||600,p=t.get("apiKey")||s.globalState.get("tidyproteomicsagent.apiKey")||"",l={provider:o,model:n,apiKey:p,baseUrl:i,maxTokens:a,timeoutSeconds:r};this.client=new me(l),s.secrets.get("tidyproteomicsagent.apiKey").then(d=>{d&&(this.client.updateConfig({apiKey:d}),this.syncActiveModelSummary().catch(()=>{}),this.refreshState().catch(()=>{}))},d=>{console.warn("[SidebarViewProvider] Could not load API key from secrets:",d)}),this.tools=new ge(this.workspaceRoot),this.orchestrator=new he(this.workspaceRoot,this.client,this.tools,d=>this.sendStateUpdate(d),(d,c)=>this.sendLog(d,c),this.getExtensionVersion()),this.ingestionRunner=new fe(this.literatureService,this.client,this._extensionUri.fsPath,d=>{this.sendLiteratureProgress(d),this.sendLiteratureState()},(d,c)=>this.sendLog(d,c)),this.advisorService=new ye(this.workspaceRoot,this.client,async()=>this.orchestrator?.getState(),async d=>{if(!this.workspaceRoot){h.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder first.");return}let c=this.client.getConfig();if(c.provider!=="ollama"&&!c.apiKey){h.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key in the Provider tab first.");return}await this.syncActiveModelSummary(),d?(h.window.showInformationMessage(`TidyProteomicsAgent Advisor: Resuming phase ${d}...`),this.orchestrator?.runSinglePhase(d).catch(f=>{h.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${f.message}`)})):(h.window.showInformationMessage("TidyProteomicsAgent Advisor: Starting pipeline execution..."),this.orchestrator?.runFullPipeline().catch(f=>{h.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${f.message}`)}))},()=>{this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorState",isGenerating:this.advisorService.isRunning(),messages:this.advisorService.getMessages()})},this._extensionUri.fsPath),this.syncActiveModelSummary().catch(()=>{}),s.subscriptions.push(h.workspace.onDidChangeConfiguration(async d=>{if(d.affectsConfiguration("tidyproteomicsagent")){let c=h.workspace.getConfiguration("tidyproteomicsagent"),f=c.get("provider");this.client.updateConfig({...f?{provider:f}:{},model:c.get("model"),baseUrl:c.get("baseUrl"),maxTokens:c.get("maxTokens"),timeoutSeconds:c.get("timeoutSeconds")}),await this.syncActiveModelSummary(),this.refreshState().catch(()=>{})}}))}static viewType="tidyproteomicsagent.sidebarView";_view;orchestrator;client;tools;literatureService;corpusService;ingestionRunner;advisorService;workspaceRoot;customWorkspaceRoot;onFolderChangedCallback;getExtensionVersion(){try{if(this.context.extension?.packageJSON?.version)return this.context.extension.packageJSON.version;let e=b.join(this._extensionUri.fsPath,"package.json");if(k.existsSync(e)){let s=JSON.parse(k.readFileSync(e,"utf-8"));if(s.version)return s.version}}catch{}return"0.1.0"}async syncActiveModelSummary(){if(this.workspaceRoot)try{let e=this.getExtensionVersion();this.orchestrator&&this.orchestrator.setExtensionVersion(e),await se(this.workspaceRoot,this.client.getConfig(),e)}catch(e){console.error("[SidebarViewProvider] Error syncing active model summary:",e)}}setCustomWorkspaceRoot(e){this.customWorkspaceRoot=e,this.workspaceRoot=e,this.literatureService.setWorkspaceRoot(e),this.advisorService.setWorkspaceRoot(e)}getActiveWorkspaceRoot(){if(this.customWorkspaceRoot&&k.existsSync(this.customWorkspaceRoot))return this.customWorkspaceRoot;let e=h.workspace.workspaceFolders;if(e&&e.length>0){let t=h.window.activeTextEditor?.document;if(t&&t.uri.scheme==="file"){let o=h.workspace.getWorkspaceFolder(t.uri);if(o){let n=o.uri.fsPath;if(n.endsWith("/extension")||n.endsWith("\\extension")){let a=b.dirname(n);if(k.existsSync(b.join(a,"agent"))||k.existsSync(b.join(a,"prompts"))||k.existsSync(b.join(a,"analysis")))return a}return n}}let i=e[0].uri.fsPath;if(i.endsWith("/extension")||i.endsWith("\\extension")){let o=b.dirname(i);if(k.existsSync(b.join(o,"agent"))||k.existsSync(b.join(o,"prompts"))||k.existsSync(b.join(o,"analysis")))return o}return i}let s=h.window.activeTextEditor?.document;if(s&&s.uri.scheme==="file"){let t=b.dirname(s.uri.fsPath);if(k.existsSync(b.join(t,"agent"))||k.existsSync(b.join(t,"prompts"))||k.existsSync(b.join(t,"analysis")))return t;let i=b.dirname(t);return k.existsSync(b.join(i,"agent"))||k.existsSync(b.join(i,"prompts"))||k.existsSync(b.join(i,"analysis"))?i:t}return""}isScanning=!1;pendingScan=!1;async onWorkspaceChanged(){try{if(this.orchestrator?.getIsRunning())return;this.customWorkspaceRoot=void 0;let e=this.getActiveWorkspaceRoot(),s=e!==this.workspaceRoot;this.workspaceRoot=e,this.tools.setWorkspaceRoot(this.workspaceRoot),this.literatureService.setWorkspaceRoot(this.workspaceRoot),this.advisorService.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&(s?await this.orchestrator.setWorkingDirectory(this.workspaceRoot):await this.refreshPhases()),await this.syncActiveModelSummary()}catch(e){console.error("[SidebarViewProvider] Error in onWorkspaceChanged:",e)}}async refreshPhases(){if(!(this.isScanning||this.orchestrator?.getIsRunning())){this.isScanning=!0;try{if(this.orchestrator){await this.orchestrator.rescanPhases();let e=await this.orchestrator.getState();this.sendStateUpdate(e)}}catch(e){console.error("[SidebarViewProvider] Error in refreshPhases:",e)}finally{this.isScanning=!1,this.pendingScan&&!this.orchestrator?.getIsRunning()&&(this.pendingScan=!1,this.refreshPhases().catch(()=>{}))}}}async refreshState(){try{if(this.orchestrator){let e=await this.orchestrator.getState();this.sendStateUpdate(e)}}catch(e){console.error("[SidebarViewProvider] Error in refreshState:",e)}}async forceReload(){if(!(this.isScanning||this.orchestrator?.getIsRunning()))try{this.orchestrator&&await this.orchestrator.forceReloadFromDisk()}catch(e){console.error("[SidebarViewProvider] Error in forceReload:",e)}}async resetAllState(){if(!(this.isScanning||this.orchestrator?.getIsRunning()))try{await this.syncActiveModelSummary(),this.orchestrator&&await this.orchestrator.resetAllState()}catch(e){console.error("[SidebarViewProvider] Error in resetAllState:",e)}}resolveWebviewView(e,s,t){this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this._extensionUri]},e.webview.html=this._getHtmlForWebview(e.webview),setTimeout(()=>{this.syncActiveModelSummary().catch(()=>{}),this.refreshPhases().catch(()=>{})},150),e.onDidChangeVisibility(()=>{e.visible&&(this.orchestrator?.getIsRunning()?this.refreshState().catch(()=>{}):this.refreshPhases().catch(()=>{}))}),e.webview.onDidReceiveMessage(async i=>{try{switch(i.type){case"saveConfig":{let o=Number(i.maxTokens)||32768,n=Number(i.timeoutSeconds)||600;this.client.updateConfig({provider:i.provider,model:i.model,apiKey:i.apiKey,baseUrl:i.baseUrl,maxTokens:o,timeoutSeconds:n}),i.apiKey?await this.context.secrets.store("tidyproteomicsagent.apiKey",i.apiKey):i.apiKey===""&&await this.context.secrets.delete("tidyproteomicsagent.apiKey");try{let r=h.workspace.getConfiguration("tidyproteomicsagent");await r.update("provider",i.provider,h.ConfigurationTarget.Global),await r.update("model",i.model,h.ConfigurationTarget.Global),await r.update("baseUrl",i.baseUrl,h.ConfigurationTarget.Global),await r.update("maxTokens",o,h.ConfigurationTarget.Global),await r.update("timeoutSeconds",n,h.ConfigurationTarget.Global)}catch{}await this.context.globalState.update("tidyproteomicsagent.provider",i.provider),await this.context.globalState.update("tidyproteomicsagent.model",i.model),await this.context.globalState.update("tidyproteomicsagent.baseUrl",i.baseUrl),await this.context.globalState.update("tidyproteomicsagent.maxTokens",o),await this.context.globalState.update("tidyproteomicsagent.timeoutSeconds",n),await this.syncActiveModelSummary(),i.silent||h.window.showInformationMessage("TidyProteomicsAgent: Configuration saved!");let a=await this.orchestrator?.getState();a&&this.sendStateUpdate(a);break}case"startPipeline":{if(!this.workspaceRoot){h.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=this.client.getConfig();if(o.provider!=="ollama"&&!o.apiKey){h.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}await this.syncActiveModelSummary(),this.orchestrator?.runFullPipeline().catch(n=>{h.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${n.message}`)});break}case"runPhase":{if(!this.workspaceRoot){h.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=this.client.getConfig();if(o.provider!=="ollama"&&!o.apiKey){h.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}await this.syncActiveModelSummary(),this.orchestrator?.runSinglePhase(i.phaseId).catch(n=>{h.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${n.message}`)});break}case"togglePhase":{this.orchestrator?.togglePhase(i.phaseId,i.enabled);break}case"stopPipeline":{this.orchestrator?.stop();break}case"forceReload":{await this.forceReload();break}case"resetState":{await this.resetAllState();break}case"openFile":{if(!this.workspaceRoot){h.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=i.relPath||"",n=b.isAbsolute(o)?o:b.join(this.workspaceRoot,o);try{k.existsSync(n)||(k.mkdirSync(b.dirname(n),{recursive:!0}),k.writeFileSync(n,"","utf-8"));let a=await h.workspace.openTextDocument(n),r;if(i.line&&i.line>0){let l=Math.min(i.line-1,a.lineCount-1);r=new h.Range(l,0,l,0)}else if(i.searchText){let d=a.getText().indexOf(i.searchText);if(d!==-1){let c=a.positionAt(d);r=new h.Range(c,c)}}let p=await h.window.showTextDocument(a,r?{selection:r}:void 0);r&&p.revealRange(r,h.TextEditorRevealType.InCenter)}catch(a){h.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${o}: ${a.message}`)}break}case"authorizeConfoundingAndRerun":{if(!this.workspaceRoot)return;let o=b.join(this.workspaceRoot,"docs","experiment.md");try{if(k.existsSync(o)){let a=await k.promises.readFile(o,"utf-8"),r=!1;a.includes("Proceed With Potential Batch Confounding**: FALSE")?(a=a.replace("Proceed With Potential Batch Confounding**: FALSE","Proceed With Potential Batch Confounding**: TRUE"),r=!0):a.includes("Authorize Unadjusted Exploratory Comparison**: FALSE")&&(a=a.replace("Authorize Unadjusted Exploratory Comparison**: FALSE","Authorize Unadjusted Exploratory Comparison**: TRUE"),r=!0),r&&(await k.promises.writeFile(o,a,"utf-8"),h.window.showInformationMessage("TidyProteomicsAgent: Batch confounding authorized in docs/experiment.md. Rerunning phase..."))}let n=i.phaseId;n&&this.orchestrator&&(await this.syncActiveModelSummary(),this.orchestrator.runSinglePhase(n).catch(a=>{h.window.showErrorMessage(`TidyProteomicsAgent: Phase execution error - ${a.message}`)}))}catch(n){h.window.showErrorMessage(`TidyProteomicsAgent: Could not update docs/experiment.md: ${n.message}`)}break}case"openPhase":{if(!this.workspaceRoot){h.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=i.fileName||"",n=o.includes("/")||o.includes("\\")?b.join(this.workspaceRoot,o):b.join(this.workspaceRoot,"analysis",o);try{let a=await h.workspace.openTextDocument(n);await h.window.showTextDocument(a)}catch(a){h.window.showErrorMessage(`TidyProteomicsAgent: Could not open ${o}: ${a.message}`)}break}case"copyPath":{this.workspaceRoot&&(await h.env.clipboard.writeText(this.workspaceRoot),h.window.showInformationMessage("TidyProteomicsAgent: Workspace path copied to clipboard!"));break}case"revealInOS":{this.workspaceRoot&&await h.commands.executeCommand("revealFileInOS",h.Uri.file(this.workspaceRoot));break}case"selectDirectory":{let o=await h.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder"});if(o&&o.length>0){let n=o[0].fsPath;this.customWorkspaceRoot=n,this.workspaceRoot=n,this.tools.setWorkspaceRoot(this.workspaceRoot),this.literatureService.setWorkspaceRoot(this.workspaceRoot),this.advisorService.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),await this.refreshPhases(),await this.syncActiveModelSummary(),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),h.window.showInformationMessage(`TidyProteomicsAgent: Active directory set to ${this.workspaceRoot}`)}break}case"rescanWorkspace":{await this.onWorkspaceChanged(),h.window.showInformationMessage("TidyProteomicsAgent: Rescanned workspace folders and phases.");break}case"createMissingFolders":{if(!this.workspaceRoot){h.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let o=["analysis","agent","code","data",b.join("data","raw"),"docs","logs","tools"];for(let n of o){let a=b.join(this.workspaceRoot,n);k.existsSync(a)||k.mkdirSync(a,{recursive:!0})}await this.refreshPhases(),h.window.showInformationMessage("TidyProteomicsAgent: Standard project folders initialized!");break}case"initWorkspace":{await this.initWorkspace(i.pipelineId||"differential_expression");break}case"promptInitWorkspace":{await this.promptInitWorkspace();break}case"requestState":{await this.refreshState(),this.sendCorpusState(),await this.advisorService.checkAndTriggerOnboarding();break}case"literatureGetState":case"corpusGetState":{this.sendLiteratureState();break}case"literatureSelect":case"corpusSelect":{try{this.syncLiteratureWorkspace(),this.literatureService.setActiveLiterature(i.fileName),this.sendLiteratureState(),await this.refreshState()}catch(o){h.window.showErrorMessage(`TidyProteomicsAgent: ${o.message}`)}break}case"literatureCreate":case"corpusCreate":{try{this.syncLiteratureWorkspace();let o=await this.literatureService.createDatabase(i.name);h.window.showInformationMessage(`TidyProteomicsAgent: Created literature database '${o.fileName}'`),this.sendLiteratureState(),await this.refreshState()}catch(o){h.window.showErrorMessage(`TidyProteomicsAgent: ${o.message}`)}break}case"literatureToggleSynthesis":case"corpusToggleSynthesis":{this.syncLiteratureWorkspace(),this.literatureService.setUseInSynthesis(!!i.enabled),this.sendLiteratureState(),await this.refreshState();break}case"literatureStats":case"corpusStats":{this.syncLiteratureWorkspace();let o=await this.literatureService.getStats(i.fileName);if(this._view&&this._view.webview){let n=o.stats||o.data?.stats||o.data?.totals;this._view.webview.postMessage({type:"literatureStats",result:o,stats:n}),this._view.webview.postMessage({type:"corpusStats",result:o,stats:n})}break}case"literatureSearch":case"corpusSearch":{let o=await this.literatureService.search(i.query,i.limit||50,i.fileName);if(this._view&&this._view.webview){let n=o.results||o.data?.results||o.data?.rows||[];this._view.webview.postMessage({type:"literatureSearchResult",result:o,results:n}),this._view.webview.postMessage({type:"corpusSearchResult",result:o,results:n})}break}case"literaturePickFolder":case"corpusPickFolder":{let o=await h.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Literature Folder"});if(o&&o.length>0){let n=o[0].fsPath;try{this.literatureService.scanIngestFolder(n),this.sendLiteratureState(),h.window.showInformationMessage(`TidyProteomicsAgent: Found ${this.literatureService.getViewState().queue.length} document(s) for ingestion queue.`)}catch(a){h.window.showErrorMessage(`TidyProteomicsAgent: ${a.message}`)}}break}case"literatureClearQueue":case"corpusClearQueue":{this.literatureService.clearQueue(),this.sendLiteratureState();break}case"literatureStartIngest":case"corpusStartIngest":{let o=this.client.getConfig();if(o.provider!=="ollama"&&!o.apiKey){h.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key in the Provider tab before running literature extraction.");return}let n=i.fileName||this.literatureService.getConfig().activeLiterature||this.literatureService.getConfig().activeCorpus;if(!n){h.window.showErrorMessage("TidyProteomicsAgent: Please select or create an active literature database first.");return}this.sendLiteratureState(),this.ingestionRunner.runIngestion(n).then(async a=>{this.sendLiteratureState();let r=await this.literatureService.getStats(n);if(this._view&&this._view.webview){let p=r.stats||r.data?.stats||r.data?.totals;this._view.webview.postMessage({type:"literatureStats",result:r,stats:p}),this._view.webview.postMessage({type:"corpusStats",result:r,stats:p})}a.success?h.window.showInformationMessage(`TidyProteomicsAgent: Indexed ${a.processed} document(s) into ${n}!`):h.window.showWarningMessage(`TidyProteomicsAgent: Ingestion finished with ${a.errors} error(s). See log for details.`)}).catch(a=>{h.window.showErrorMessage(`TidyProteomicsAgent: Ingestion error - ${a.message}`),this.sendLiteratureState()});break}case"literatureAbortIngest":case"corpusAbortIngest":{this.ingestionRunner.abort(),h.window.showInformationMessage("TidyProteomicsAgent: Aborting ingestion...");break}case"literatureGenerateReport":{let o=i.fileName||this.literatureService.getConfig().activeLiterature||this.literatureService.getConfig().activeCorpus;if(!o){h.window.showErrorMessage("TidyProteomicsAgent: Please select or create an active literature database first.");return}try{h.window.showInformationMessage(`TidyProteomicsAgent: Generating accounting report for ${o}...`);let n=await this.literatureService.generateReport(o);if(n.ok){h.window.showInformationMessage("TidyProteomicsAgent: Generated docs/literature_database.md");let a=b.join(this.workspaceRoot||"","docs","literature_database.md");if(k.existsSync(a)){let r=await h.workspace.openTextDocument(a);await h.window.showTextDocument(r,{preview:!1})}}else h.window.showErrorMessage(`TidyProteomicsAgent: Failed to generate report: ${n.error}`)}catch(n){h.window.showErrorMessage(`TidyProteomicsAgent: Report generation error - ${n.message}`)}break}case"literatureOpenReport":{let o=b.join(this.workspaceRoot||"","docs","literature_database.md");if(k.existsSync(o)){let n=await h.workspace.openTextDocument(o);await h.window.showTextDocument(n,{preview:!1})}else{let n=this.literatureService.getConfig().activeLiterature||this.literatureService.getConfig().activeCorpus;if(n&&(await this.literatureService.generateReport(n)).ok&&k.existsSync(o)){let r=await h.workspace.openTextDocument(o);await h.window.showTextDocument(r,{preview:!1});return}h.window.showWarningMessage("TidyProteomicsAgent: docs/literature_database.md does not exist yet. Click 'Regenerate' first.")}break}case"advisorSendMessage":{let o=String(i.text||"").trim();if(!o)return;console.log("[SidebarViewProvider] advisorSendMessage:",o);try{let n=await this.advisorService.sendMessage(o,a=>{this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorChunk",chunk:a})});this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorDone",reply:n.reply,usage:n.usage,messages:this.advisorService.getMessages()})}catch(n){h.window.showErrorMessage(`TidyProteomicsAgent Advisor: ${n.message}`),this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorError",error:n.message||String(n),messages:this.advisorService.getMessages()})}break}case"advisorClear":{await this.advisorService.clearMessages(),this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorState",isGenerating:!1,messages:[]});break}case"advisorStop":{this.advisorService.cancel();break}case"advisorGetState":{await this.advisorService.checkAndTriggerOnboarding(),this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorState",isGenerating:this.advisorService.isRunning(),messages:this.advisorService.getMessages()});break}case"advisorPickDataFile":{let o=await h.window.showOpenDialog({canSelectFiles:!0,canSelectFolders:!1,canSelectMany:!1,openLabel:"Select Dataset File",title:"Select Mass Spectrometry Dataset File for TidyProteomics",filters:{"Proteomics Data":["xlsx","csv","tsv","txt","rds","parquet","zip"],"All Files":["*"]}});if(o&&o.length>0){let a=o[0].fsPath;this.workspaceRoot&&a.startsWith(this.workspaceRoot)&&(a=b.relative(this.workspaceRoot,a));try{let r=await this.advisorService.sendMessage(a,p=>{this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorChunk",chunk:p})});this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorDone",reply:r.reply,usage:r.usage,messages:this.advisorService.getMessages()})}catch(r){h.window.showErrorMessage(`TidyProteomicsAgent Advisor: ${r.message}`),this._view&&this._view.webview&&this._view.webview.postMessage({type:"advisorError",error:r.message||String(r),messages:this.advisorService.getMessages()})}}break}}}catch(o){h.window.showErrorMessage(`TidyProteomicsAgent Error: ${o.message}`)}})}async promptInitWorkspace(){if(!this.workspaceRoot){let t=await h.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder to Initialize"});if(t&&t.length>0)this.workspaceRoot=t[0].fsPath,this.customWorkspaceRoot=this.workspaceRoot,this.tools.setWorkspaceRoot(this.workspaceRoot),this.literatureService.setWorkspaceRoot(this.workspaceRoot),this.advisorService.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),await this.syncActiveModelSummary();else return}let e=[{label:"$(symbol-structure) Differential Expression Pipeline",description:"Full 11-phase workflow (Install, Inspect, Normalize, Impute, Expression, Enrichment, Observations, Knowledge, WebSearch, Literature, Synthesis)",id:"differential_expression"},{label:"$(graph) Quality Control & Exploration Pipeline",description:"2-phase rapid QC and exploratory data analysis",id:"quality_control_only"}],s=await h.window.showQuickPick(e,{placeHolder:"Select a pipeline template to initialize this workspace"});s&&await this.initWorkspace(s.id)}async initWorkspace(e="differential_expression"){if(!this.workspaceRoot){let s=await h.window.showOpenDialog({canSelectFiles:!1,canSelectFolders:!0,canSelectMany:!1,openLabel:"Select Analysis Folder to Initialize"});if(s&&s.length>0)this.workspaceRoot=s[0].fsPath,this.customWorkspaceRoot=this.workspaceRoot,this.tools.setWorkspaceRoot(this.workspaceRoot),this.literatureService.setWorkspaceRoot(this.workspaceRoot),this.advisorService.setWorkspaceRoot(this.workspaceRoot),this.orchestrator&&await this.orchestrator.setWorkingDirectory(this.workspaceRoot),this.onFolderChangedCallback&&this.onFolderChangedCallback(this.workspaceRoot),await this.syncActiveModelSummary();else return h.window.showErrorMessage("TidyProteomicsAgent: Please open or select a workspace folder first."),!1}try{let t=[b.join(this._extensionUri.fsPath,"templates"),b.join(this._extensionUri.fsPath,"extension","templates"),b.join(this.context.extensionPath,"templates"),b.join(this.context.extensionPath,"extension","templates"),b.join(__dirname,"..","templates"),b.join(__dirname,"..","..","templates"),b.join(__dirname,"templates"),b.join(this.workspaceRoot,"extension","templates"),b.join(this.workspaceRoot,"templates")].find(d=>k.existsSync(d));if(!t)return h.window.showErrorMessage("TidyProteomicsAgent: Template directory not found in extension or workspace."),!1;let i=["analysis","agent","code","data",b.join("data","raw"),"docs","logs","tools"];for(let d of i){let c=b.join(this.workspaceRoot,d);k.existsSync(c)||k.mkdirSync(c,{recursive:!0})}let o=(d,c,f=!1)=>{k.existsSync(d)&&(f||!k.existsSync(c))&&(k.mkdirSync(b.dirname(c),{recursive:!0}),k.copyFileSync(d,c))},n=b.join(t,"shared");if(k.existsSync(n)){o(b.join(n,"code","00_install.R"),b.join(this.workspaceRoot,"code","00_install.R"),!0),o(b.join(n,"tools","lint_tidyproteomics.R"),b.join(this.workspaceRoot,"tools","lint_tidyproteomics.R"),!0);let d=b.join(n,"agent");if(k.existsSync(d)){let m=k.readdirSync(d);for(let g of m)g.endsWith(".md")&&o(b.join(d,g),b.join(this.workspaceRoot,"agent",g),!0)}o(b.join(n,"docs","experiment.md"),b.join(this.workspaceRoot,"docs","experiment.md"),!1),o(b.join(n,"docs","notes.md"),b.join(this.workspaceRoot,"docs","notes.md"),!1),o(b.join(n,"docs","concept.md"),b.join(this.workspaceRoot,"docs","concept.md"),!1),o(b.join(n,".gitignore"),b.join(this.workspaceRoot,".gitignore"),!1),o(b.join(n,"logs",".gitkeep"),b.join(this.workspaceRoot,"logs",".gitkeep"),!1),o(b.join(n,"data","raw",".gitkeep"),b.join(this.workspaceRoot,"data","raw",".gitkeep"),!1);let c=b.join(n,"tools","literature");if(k.existsSync(c)){let m=k.readdirSync(c).filter(g=>g.endsWith(".R"));for(let g of m)o(b.join(c,g),b.join(this.workspaceRoot,"tools","literature",g),!0)}let f=b.join(this.workspaceRoot,"literature");k.existsSync(f)||k.mkdirSync(f,{recursive:!0})}let a=b.join(t,"pipelines",e);if(k.existsSync(a)||(a=b.join(t,"pipelines","differential_expression")),k.existsSync(a)){let d=k.readdirSync(a).filter(c=>c.endsWith(".md"));for(let c of d)o(b.join(a,c),b.join(this.workspaceRoot,"analysis",c),!0)}else h.window.showWarningMessage(`TidyProteomicsAgent: Pipeline templates not found in ${t}/pipelines.`);await this.syncActiveModelSummary(),await this.refreshPhases();let r=await this.orchestrator?.getState();r&&this.sendStateUpdate(r);let p=e==="quality_control_only"?"Quality Control & Exploration":"Standard Differential Expression";h.window.showInformationMessage(`TidyProteomicsAgent: Workspace initialized with ${p} pipeline!`);let l=b.join(this.workspaceRoot,"docs","experiment.md");if(k.existsSync(l))try{let d=await h.workspace.openTextDocument(l);await h.window.showTextDocument(d)}catch{}return!0}catch(s){return h.window.showErrorMessage(`TidyProteomicsAgent: Failed to initialize workspace - ${s.message}`),!1}}startPipeline(){if(!this.workspaceRoot){h.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}if(this.orchestrator&&this.orchestrator.getPhases().length===0){h.window.showInformationMessage("TidyProteomicsAgent: No analysis tasks found to execute. Please initialize an analysis pipeline first.");return}this.syncActiveModelSummary().catch(()=>{}),this.orchestrator?.runFullPipeline().catch(e=>{h.window.showErrorMessage(`TidyProteomicsAgent: Pipeline error - ${e.message}`)})}async runSelectedPhase(){if(!this.workspaceRoot){h.window.showErrorMessage("TidyProteomicsAgent: Please open a workspace folder in VS Code first.");return}let e=this.client.getConfig();if(e.provider!=="ollama"&&!e.apiKey){h.window.showErrorMessage("TidyProteomicsAgent: Please enter an API key first.");return}if(await this.syncActiveModelSummary(),!this.orchestrator)return;let s=this.orchestrator.getPhases();if(s.length===0){h.window.showInformationMessage("TidyProteomicsAgent: No phases found to run.");return}let t=s.find(n=>n.status==="running")||s.find(n=>n.status==="pending"&&n.enabled!==!1)||s[0],i=s.map(n=>({label:n.title,description:`(${n.fileName}) - ${n.status.toUpperCase()}`,phaseId:n.id,picked:n.id===t?.id})),o=await h.window.showQuickPick(i,{placeHolder:"Select phase to run in isolation"});o&&this.orchestrator.runSinglePhase(o.phaseId).catch(n=>{h.window.showErrorMessage(`TidyProteomicsAgent: Error running phase - ${n.message}`)})}sendStateUpdate(e){if(this._view&&this._view.webview)try{let s=this._view.webview.postMessage({type:"stateUpdate",state:e});s&&typeof s.then=="function"&&s.then(void 0,t=>{console.warn("[SidebarViewProvider] Failed to post stateUpdate:",t)})}catch(s){console.warn("[SidebarViewProvider] Exception posting stateUpdate:",s)}if(e&&Array.isArray(e.phases)){let s=e.phases.find(t=>t.status==="failed");s&&this.advisorService.handlePhaseHalted(s).catch(t=>{console.warn("[SidebarViewProvider] Error handling halted phase in advisor:",t)})}}syncLiteratureWorkspace(){let e=this.getActiveWorkspaceRoot();return e&&e!==this.workspaceRoot?(this.workspaceRoot=e,this.tools.setWorkspaceRoot(e),this.literatureService.setWorkspaceRoot(e),this.advisorService.setWorkspaceRoot(e)):e&&(this.literatureService.setWorkspaceRoot(e),this.advisorService.setWorkspaceRoot(e)),this.workspaceRoot}sendLiteratureState(){if(this._view&&this._view.webview)try{this.syncLiteratureWorkspace();let e=this.literatureService.getViewState(this.ingestionRunner.getIsRunning()?"ingesting":void 0),s=this._view.webview.postMessage({type:"literatureState",state:e});s&&typeof s.then=="function"&&s.then(void 0,i=>{console.warn("[SidebarViewProvider] Failed to post literatureState:",i)});let t=this._view.webview.postMessage({type:"corpusState",state:e});t&&typeof t.then=="function"&&t.then(void 0,i=>{console.warn("[SidebarViewProvider] Failed to post corpusState:",i)})}catch(e){console.warn("[SidebarViewProvider] Exception posting literatureState:",e)}}sendCorpusState(){this.sendLiteratureState()}sendLiteratureProgress(e){if(this._view&&this._view.webview)try{this._view.webview.postMessage({type:"literatureProgress",event:e}),this._view.webview.postMessage({type:"corpusProgress",event:e})}catch(s){console.warn("[SidebarViewProvider] Exception posting literatureProgress:",s)}}sendCorpusProgress(e){this.sendLiteratureProgress(e)}sendLog(e,s=!1){if(this._view&&this._view.webview)try{let t=this._view.webview.postMessage({type:"log",text:e,updateLast:s});t&&typeof t.then=="function"&&t.then(void 0,i=>{console.warn("[SidebarViewProvider] Failed to post log:",i)})}catch(t){console.warn("[SidebarViewProvider] Exception posting log:",t)}}escapeAttr(e){return String(e||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}_cachedIcons;_loadIcons(){let e={},s=b.join(this._extensionUri.fsPath,"media");try{if(k.existsSync(s)){let t=k.readdirSync(s);for(let i of t)if(i.endsWith(".svg")){let o=i.replace(".svg",""),n=k.readFileSync(b.join(s,i),"utf-8");n=n.replace(/<\?xml[^>]*\?>/g,"").trim(),n=n.replace(/\s(width|height)="[^"]*"/g,""),o==="robot"?n=n.replace("<svg ",`<svg class="svg-icon svg-icon-${o}" `):n=n.replace("<svg ",`<svg class="svg-icon svg-icon-${o}" fill="currentColor" `),e[o]=n}}}catch(t){console.error("[SidebarViewProvider] Error loading SVG icons:",t)}return e}_getIcons(){return this._cachedIcons||(this._cachedIcons=this._loadIcons()),this._cachedIcons}_getHtmlForWebview(e){let s=this.client.getConfig(),t=this._getIcons();return`<!DOCTYPE html>
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
      grid-template-columns: repeat(6, minmax(0, 1fr));
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
    #pane-literature.active,
    #pane-chat.active {
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

    /* Live Advisor Chat Styles */
    .advisor-container {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      height: 100%;
      min-height: 0;
      gap: 8px;
    }
    .advisor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      flex-shrink: 0;
    }
    .advisor-suggestions {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      padding-bottom: 2px;
      flex-shrink: 0;
      scrollbar-width: none;
    }
    .advisor-suggestions::-webkit-scrollbar {
      display: none;
    }
    .advisor-chip {
      background: rgba(59, 130, 246, 0.1);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 12px;
      padding: 3px 8px;
      font-size: 9.5px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .advisor-chip:hover {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .advisor-thread {
      flex: 1 1 auto;
      min-height: 120px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 4px 2px;
      margin-bottom: 4px;
    }
    .advisor-msg {
      display: flex;
      gap: 6px;
      max-width: 100%;
    }
    .advisor-msg.user {
      flex-direction: row-reverse;
    }
    .advisor-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .advisor-avatar .svg-icon {
      width: 13px;
      height: 13px;
    }
    .advisor-msg.user .advisor-avatar {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    .advisor-bubble {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 11px;
      line-height: 1.45;
      color: var(--fg);
      max-width: 88%;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .advisor-msg.user .advisor-bubble {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.35);
      color: #dbeafe;
    }
    .advisor-msg-title {
      font-size: 9.5px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .advisor-msg.user .advisor-msg-title {
      color: #60a5fa;
    }
    .advisor-msg-body code {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      background: rgba(0, 0, 0, 0.3);
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .advisor-msg-body pre {
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 8px;
      overflow-x: auto;
      margin: 6px 0;
    }
    .advisor-msg-body pre code {
      background: transparent;
      padding: 0;
      border: none;
      font-size: 10px;
    }
    .advisor-msg-body ul, .advisor-msg-body ol {
      margin: 4px 0 6px 16px;
      padding: 0;
    }
    .advisor-msg-body li {
      margin-bottom: 2px;
    }
    .advisor-msg-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }
    .advisor-msg-chip {
      background: var(--input-bg, #252526);
      color: var(--primary, #3b82f6);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 12px;
      padding: 3px 9px;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .advisor-msg-chip:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: var(--primary, #3b82f6);
      transform: translateY(-1px);
    }
    .advisor-pipeline-banner {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.08));
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    .advisor-input-area {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .advisor-input-wrapper {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: border-color 0.15s ease;
    }
    .advisor-input-wrapper:focus-within {
      border-color: var(--input-focus);
    }
    #advisorInput {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--input-fg);
      font-family: var(--vscode-font-family, inherit);
      font-size: 11px;
      line-height: 1.4;
      resize: none;
      min-height: 38px;
      max-height: 120px;
      outline: none;
      box-sizing: border-box;
      padding: 0;
    }
    .advisor-input-controls {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
    }
    .advisor-input-hint {
      font-size: 8.5px;
      color: var(--muted);
      text-align: right;
      padding-right: 2px;
    }
    .advisor-streaming-cursor {
      display: inline-block;
      width: 6px;
      height: 11px;
      background: var(--primary);
      margin-left: 2px;
      animation: pulse 1s infinite;
      vertical-align: middle;
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
      min-width: 0;
      flex: 0 1 auto;
    }
    .task-name:hover {
      color: var(--primary);
      text-decoration: underline;
    }
    .task-action-icons {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
      margin: 0;
    }
    button.task-action-icon-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--muted);
      border-radius: 3px;
      padding: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      line-height: 1;
      opacity: 0.65;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    button.task-action-icon-btn.has-run {
      opacity: 0.95;
      color: var(--vscode-foreground, #d4d4d4);
    }
    button.task-action-icon-btn:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.35);
      color: var(--vscode-foreground, var(--fg));
      opacity: 1;
    }
    button.task-action-icon-btn .svg-icon {
      width: 11px;
      height: 11px;
      vertical-align: middle;
      margin: 0;
      pointer-events: none;
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
      <h2>${t.robot||""} TidyProteomicsAgent</h2>
      <span class="badge badge-completed" id="pipelineHeaderBadge">IDLE</span>
    </div>
    <div class="ws-chip" id="wsChip" title="Click to view Active Directory">
      <span>${t["folder-open"]||""}</span>
      <span id="wsChipName">Project</span>
    </div>
  </div>

  <!-- Segmented Tab Navigation -->
  <div class="tab-bar">
    <button type="button" class="tab-btn active" data-tab="pipeline" onclick="window.switchTab && window.switchTab('pipeline')" title="Pipeline execution, phases & live feed">
      <span class="tab-icon">${t["rocket-lunch"]||""}</span>
      <span class="tab-label">Pipeline</span>
      <span class="tab-indicator" id="pipelineIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="chat" onclick="window.switchTab && window.switchTab('chat')" title="Proteomics Live Advisor">
      <span class="tab-icon">${t.chat||""}</span>
      <span class="tab-label">Chat</span>
      <span class="tab-indicator" id="chatIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="blackboard" onclick="window.switchTab && window.switchTab('blackboard')" title="Memory notes, protocol & chat log">
      <span class="tab-icon">${t.ftp||""}</span>
      <span class="tab-label">Memory</span>
    </button>
    <button type="button" class="tab-btn" data-tab="literature" onclick="window.switchTab && window.switchTab('literature')" title="Literature Database & Ingestion">
      <span class="tab-icon">${t.database||""}</span>
      <span class="tab-label">Literature</span>
      <span class="tab-indicator" id="literatureIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="provider" onclick="window.switchTab && window.switchTab('provider')" title="LLM Provider, model & API key">
      <span class="tab-icon">${t.cube||""}</span>
      <span class="tab-label">Provider</span>
      <span class="tab-indicator" id="providerIndicator"></span>
    </button>
    <button type="button" class="tab-btn" data-tab="directory" onclick="window.switchTab && window.switchTab('directory')" title="Active directory & workspace folder status">
      <span class="tab-icon">${t["folder-open"]||""}</span>
      <span class="tab-label">Directory</span>
      <span class="tab-indicator" id="dirIndicator"></span>
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
          <span style="font-size:15px; display:inline-flex; align-items:center;">${t["rocket-lunch"]||""}</span>
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
          <span>${t.sparkles||""}</span> Initialize Working Directory
        </button>
      </div>
    </div>

    <!-- State C: Active Pipeline Dashboard (shown when analysis/ exists and has tasks) -->
    <div id="activePipelineDashboard" style="display:none;">
      <!-- Pipeline Execution Controls & Advisor Guidance -->
      <div class="section">
        <div id="advisorPipelineBanner" class="advisor-pipeline-banner">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:14px; line-height:1;">\u{1F4AC}</span>
              <div>
                <div style="font-weight:600; font-size:11px;">Advisor-Guided Pipeline</div>
                <div style="font-size:9.5px; color:var(--muted);" id="advisorBannerSubtext">Chat with Advisor to configure and start</div>
              </div>
            </div>
            <button type="button" id="openAdvisorFromPipelineBtn" class="btn-insight-action-primary" style="padding:4px 8px; font-size:10px; cursor:pointer;" title="Switch to Live Advisor">Open Advisor \u2197</button>
          </div>
        </div>
        <div style="display:flex; gap:4px; margin-bottom:8px;">
          <button id="stopBtn" class="btn-stop" style="display:none; width:100%;">${t.stop||""} Stop Pipeline</button>
        </div>

        <div class="section-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <h3>${t["rocket-lunch"]||""} Analysis Tasks</h3>
            <button type="button" id="refreshTasksBtn" class="btn-icon" title="Reload tasks and sync progress from disk">${t.refresh||"\u21BB"}</button>
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
          <h3>${t.coins||""} Tokens</h3>
        </div>
        <table class="tokens-table">
          <thead>
            <tr>
              <th>Prompt</th>
              <th>Cached ${t.sparkles||""}</th>
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

      <!-- Live Terminal Feed -->
      <div class="section terminal-section">
        <div class="section-header">
          <h3>${t.terminal||""} Live Feed</h3>
          <div style="display:flex; gap:4px;">
            <button class="btn-sm" id="viewChatLogBtn" title="Open master logs/pipeline.md in VS Code">${t.list||""} Pipeline Log</button>
            <button class="btn-sm" id="clearLogBtn">Clear</button>
          </div>
        </div>
        <div class="terminal" id="terminalLog">TidyProteomicsAgent ready. Phases discovered from analysis/*.md.</div>
      </div>
    </div>
  </div>

  <!-- TAB: CHAT ADVISOR -->
  <div class="tab-pane" id="pane-chat" style="display:none;">
    <div class="advisor-container">
      <div class="advisor-header">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:13px; color:var(--primary); display:inline-flex; align-items:center;">${t.chat||""}</span>
          <h3 style="margin:0; font-size:12px; font-weight:600;">Live Advisor</h3>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" class="btn-sm" id="advisorClearBtn" title="Clear conversation history">Clear</button>
        </div>
      </div>

      <!-- Quick Action Suggestion Chips -->
      <div class="advisor-suggestions">
        <button type="button" class="advisor-chip" data-prompt="What is the current status of the analysis pipeline? Any issues or recommended next steps?">\u{1F4CA} Pipeline Status</button>
        <button type="button" class="advisor-chip" data-prompt="Review docs/experiment.md and verify if my experimental factors, sample groupings, and contrasts are properly set up.">\u{1F9EA} Check Design</button>
        <button type="button" class="advisor-chip" data-prompt="Explain any batch confounding warnings or risks detected in the dataset, and what actions I should take.">\u26A0\uFE0F Batch Effects</button>
        <button type="button" class="advisor-chip" data-prompt="Summarize the key biological findings and observations recorded in docs/notes.md.">\u{1F9EC} Summary</button>
      </div>

      <!-- Messages Thread -->
      <div class="advisor-thread" id="advisorThread">
        <div class="advisor-msg assistant">
          <div class="advisor-avatar">${t.robot||"\u{1F916}"}</div>
          <div class="advisor-bubble">
            <div class="advisor-msg-title">TidyProteomics Live Advisor</div>
            <div class="advisor-msg-body">
              Hello! I am your live proteomics advisor. I monitor your experimental design in <code>docs/experiment.md</code>, pipeline execution status, and findings in <code>docs/notes.md</code>.
              <br><br>
              Feel free to ask questions about:
              <ul>
                <li>Experimental design, sample grouping, & contrasts</li>
                <li>Batch effect detection & confounding evaluation</li>
                <li>Choosing normalization & imputation methods in tidyproteomics</li>
                <li>Interpreting volcano plots, PCA, & differential expression</li>
                <li>Enrichment analysis & pathway biology</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Bar -->
      <div class="advisor-input-area">
        <div class="advisor-input-wrapper">
          <textarea id="advisorInput" rows="1" placeholder="Ask the advisor about your analysis, design, or results..."></textarea>
          <div class="advisor-input-controls">
            <button type="button" id="advisorStopBtn" class="btn-stop btn-sm" style="display:none;" title="Stop generation">
              ${t.stop||""} Stop
            </button>
            <button type="button" id="advisorSendBtn" class="btn-primary btn-sm" title="Send message to Advisor">
              ${t.play||""} Send
            </button>
          </div>
        </div>
        <div class="advisor-input-hint">Enter to send \u2022 Shift+Enter for new line</div>
      </div>
    </div>
  </div>

  <!-- TAB 2: MEMORY & PROTOCOL -->
  <div class="tab-pane" id="pane-blackboard">
    <!-- Persistent Global Context -->
    <div class="section">
      <div class="section-header">
        <h3>${t.globe||""} Global Context</h3>
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
        <h3>${t.ftp||""} Shared Memory</h3>
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
        <h3>${t["list-check"]||""} Logs</h3>
      </div>
      <div class="section-desc">Lean audit trail capturing assistant thoughts, tool executions, and tokens.</div>
      <div id="logsContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Loading logs...</div>
      </div>
    </div>

    <!-- Architecture Callout -->
    <div class="callout">
      <b>${t.info||""} TidyProteomicsAgent Architecture:</b><br>
      \u2022 <b>Global Context</b> (<code>agent/</code>) is cached across phases to slash token costs.<br>
      \u2022 <b>Ephemeral Sub-Loops</b> run in isolation for each phase, preventing context bloat.<br>
      \u2022 <b>Shared Memory</b> (<code>docs/notes.md</code>) passes findings between phases.
    </div>
  </div>

  <!-- TAB 3: LLM PROVIDER -->
  <div class="tab-pane" id="pane-provider">
    <div class="section">
      <div class="section-header">
        <h3>${t.cube||""} Provider Configuration</h3>
        <button class="btn-sm" id="saveConfigBtn">Save Settings</button>
      </div>

      <div class="form-group">
        <label>Provider</label>
        <select id="providerSelect">
          <option value="anthropic" ${s.provider==="anthropic"?"selected":""}>Anthropic (Prompt Caching)</option>
          <option value="openrouter" ${s.provider==="openrouter"?"selected":""}>OpenRouter (Unified Gateway)</option>
          <option value="ollama" ${s.provider==="ollama"?"selected":""}>Remote Hosted Ollama</option>
          <option value="gemini" ${s.provider==="gemini"?"selected":""}>Google Gemini</option>
          <option value="openai" ${s.provider==="openai"?"selected":""}>OpenAI</option>
        </select>
      </div>

      <div class="form-group" id="baseUrlGroup">
        <label id="baseUrlLabel">Base URL / Endpoint</label>
        <input type="text" id="baseUrlInput" value="${this.escapeAttr(s.baseUrl||"")}" placeholder="http://remote-host:11434/v1" />
        <span id="baseUrlHint" style="font-size:9px; color:var(--muted); display:block; margin-top:2px;"></span>
      </div>

      <div class="form-group">
        <label id="modelLabel">Model ID</label>
        <input type="text" id="modelInput" value="${this.escapeAttr(s.model||"")}" placeholder="claude-3-7-sonnet-20250219" />
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="apiKeyLabel">API Key</label>
          <span id="toggleKeyVisibility" style="font-size:9px; color:var(--primary); cursor:pointer;">Show</span>
        </div>
        <input type="password" id="apiKeyInput" value="${this.escapeAttr(s.apiKey||"")}" placeholder="sk-..." />
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="maxTokensLabel">Max Output Tokens</label>
          <span style="font-size:9px; color:var(--muted);">Default: 32,768</span>
        </div>
        <select id="maxTokensSelect">
          <option value="4096" ${s.maxTokens===4096?"selected":""}>4,096 (Standard / Minimal)</option>
          <option value="8192" ${s.maxTokens===8192?"selected":""}>8,192</option>
          <option value="16384" ${s.maxTokens===16384?"selected":""}>16,384 (Recommended for Reports)</option>
          <option value="32768" ${s.maxTokens===32768||!s.maxTokens?"selected":""}>32,768 (Full Manuscripts / Long Synthesis)</option>
          <option value="65536" ${s.maxTokens===65536?"selected":""}>65,536</option>
          <option value="128000" ${s.maxTokens===128e3?"selected":""}>128,000 (OpenRouter Frontier / Luna Max)</option>
        </select>
        <span style="font-size:9px; color:var(--muted); display:block; margin-top:2px;">Prevents tool call JSON truncation during long file generation (e.g. docs/scientific_report.md).</span>
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label id="timeoutSecondsLabel">Request Timeout</label>
          <span style="font-size:9px; color:var(--muted);">Default: 600s (10m)</span>
        </div>
        <select id="timeoutSecondsSelect">
          <option value="180" ${s.timeoutSeconds===180?"selected":""}>180s (3m - Fast Cloud Models)</option>
          <option value="300" ${s.timeoutSeconds===300?"selected":""}>300s (5m - Standard)</option>
          <option value="600" ${s.timeoutSeconds===600||!s.timeoutSeconds?"selected":""}>600s (10m - Recommended for Large / Local Models)</option>
          <option value="900" ${s.timeoutSeconds===900?"selected":""}>900s (15m - Extended Reasoning / Heavy Synthesis)</option>
          <option value="1200" ${s.timeoutSeconds===1200?"selected":""}>1,200s (20m - Ultra Long / Slow Local Inference)</option>
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
        <h3>${t.stats||""} Active Model Summary</h3>
        <button class="icon-btn" data-action="openFile" data-path="docs/llm.md" title="Open docs/llm.md" style="font-size:10px; padding:2px 6px;">docs/llm.md \u2197</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Provider:</span>
          <b id="summaryProvider">${(s.provider||"anthropic").toUpperCase()}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Model:</span>
          <b id="summaryModel" style="font-family:monospace;">${s.model}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Prompt Caching:</span>
          <span id="summaryCaching" class="badge badge-cached">Active ${t.sparkles||""}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Max Output Tokens:</span>
          <b id="summaryMaxTokens" style="font-family:monospace;">${(s.maxTokens||32768).toLocaleString()}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Request Timeout:</span>
          <b id="summaryTimeout" style="font-family:monospace;">${s.timeoutSeconds||600}s</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:var(--muted);">Key Status:</span>
          <span id="summaryKeyStatus" class="badge ${s.apiKey?"badge-completed":"badge-failed"}">${s.apiKey?"Configured":"Missing"}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 4: ACTIVE DIRECTORY -->
  <div class="tab-pane" id="pane-directory">
    <!-- Active Workspace Card -->
    <div class="section">
      <div class="section-header">
        <h3>${t["folder-open"]||""} Active VS Code Workspace</h3>
      </div>
      <div class="section-desc">TidyProteomicsAgent automatically operates within the folder currently opened in VS Code.</div>

      <div style="background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:8px; margin-bottom:8px;">
        <div id="dirWsName" style="font-weight:600; font-size:12px; color:#93c5fd; margin-bottom:2px;">Checking workspace...</div>
        <div id="dirWsPath" style="font-size:9px; color:var(--muted); font-family:monospace; word-break:break-all;"></div>
      </div>

      <div style="display:flex; gap:6px;">
        <button type="button" class="btn-secondary btn-sm" id="copyPathBtn" style="flex:1;">${t.list||""} Copy Path</button>
        <button type="button" class="btn-secondary btn-sm" id="revealOSBtn" style="flex:1;">${t["folder-open"]||""} Reveal in OS</button>
        <button type="button" class="btn-secondary btn-sm" id="chooseDirBtn" style="flex:1;">${t["folder-open"]||""} Choose Folder...</button>
      </div>
    </div>

    <!-- Project Structure Health Check -->
    <div class="section">
      <div class="section-header">
        <h3>${t.database||""} Project Structure Health</h3>
      </div>
      <div class="section-desc">Standard directories required for autonomous pipelines:</div>

      <div id="foldersListContainer">
        <div style="text-align:center; padding:6px; color:var(--muted); font-size:10px;">Scanning folders...</div>
      </div>

      <div style="display:flex; gap:6px; margin-top:8px;">
        <button type="button" class="btn-secondary btn-sm" id="rescanDirBtn" style="flex:1;">${t.refresh||""} Rescan</button>
        <button type="button" class="btn-sm" id="createFoldersBtn" style="flex:1;">${t["folder-open"]||""} Create Folders</button>
      </div>
      <div style="margin-top:6px;">
        <button type="button" class="btn-primary btn-sm" id="initPipelineQuickBtn" style="width:100%; padding:6px; font-weight:600;">${t.sparkles||""} Initialize Pipeline Scaffolding...</button>
      </div>
    </div>

    <!-- Guidance Note on Changing Workspace -->
    <div class="callout" style="line-height:1.5;">
      <b>${t.info||""} How to Change Analysis Folders:</b><br>
      \u2022 <b>Option 1 (Recommended in-window):</b> Click <b>${t["folder-open"]||""} Choose Folder...</b> above. This switches the active project instantly without restarting the window.<br>
      \u2022 <b>Option 2:</b> In VS Code, use <b>File &gt; Add Folder to Workspace...</b> to mount your dataset folder into the Explorer.<br>
      <div style="margin-top:6px; padding:6px; background:rgba(239, 68, 68, 0.1); border-left:3px solid var(--error); border-radius:3px; font-size:10px; color:#fca5a5;">
        <b>${t.alert||""} Debug Window Note:</b> When debugging this extension (F5), do <b>not</b> use <i>File &gt; Open Folder...</i> because VS Code restarts the window and terminates the debug session. Use <b>Choose Folder...</b> or <b>Add Folder to Workspace...</b> instead.
      </div>
    </div>
  </div>

  <!-- TAB 5: LITERATURE -->
  <div class="tab-pane" id="pane-literature" style="display:none;">
    <!-- Literature Selector & Creator Section -->
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${t.database||""} Literature Knowledge Database
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
        <button type="button" class="btn-sm" id="createLiteratureBtn" style="white-space:nowrap;">${t.sparkles||""} Create</button>
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
          ${t.stats||""} Literature Metrics
        </h3>
        <button type="button" id="refreshLiteratureStatsBtn" class="btn-icon" title="Refresh metrics from DuckDB" style="padding:2px 4px; font-size:10px;">
          ${t.refresh||"\u21BB"}
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
          ${t.summary||""} Open Report
        </button>
        <button type="button" class="btn-sm btn-secondary" id="regenerateLiteratureReportBtn" style="flex:1; display:flex; align-items:center; justify-content:center; gap:5px;" title="Regenerate docs/literature_database.md from active DuckDB">
          ${t.refresh||"\u21BB"} Regenerate
        </button>
      </div>
    </div>

    <!-- Preview Search Section -->
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <h3 style="margin:0; font-size:11px; font-weight:600; display:flex; align-items:center; gap:5px;">
          ${t.summary||""} Assertion Search
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
          ${t.layers||""} Ingestion Queue
        </h3>
        <span class="badge badge-idle" id="ingestQueueBadge">0 FILES</span>
      </div>

      <div style="display:flex; gap:6px; margin-bottom:8px; flex:0 0 auto;">
        <button type="button" class="btn-secondary btn-sm" id="pickFolderBtn" style="flex:1;">
          ${t["folder-open"]||""} Select Literature Folder...
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
          ${t.play||""} Run Ingestion Pipeline
        </button>
        <button type="button" class="btn-stop btn-sm" id="abortIngestBtn" style="display:none; padding:6px; font-weight:600;">
          ${t.stop||""} Abort
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
    const ICONS = ${JSON.stringify(t)};

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
            p.style.display = (tabId === "pipeline" || tabId === "literature" || tabId === "corpus" || tabId === "chat") ? "flex" : "block";
          } else {
            p.classList.remove("active");
            p.style.display = "none";
          }
        });

        if (tabId === "literature" || tabId === "corpus") {
          vscode.postMessage({ type: "literatureGetState" });
        } else if (tabId === "chat") {
          vscode.postMessage({ type: "advisorGetState" });
          const input = document.getElementById("advisorInput");
          if (input) setTimeout(function () { input.focus(); }, 50);
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

      // Open Advisor from Pipeline Banner
      const openAdv = e.target.closest ? e.target.closest("#openAdvisorFromPipelineBtn") : null;
      if (openAdv) {
        switchTab("chat");
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
        } else if (action === "openAdvisorTab") {
          switchTab("chat");
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

          if (startPipelineBtn) startPipelineBtn.style.display = "none";
          if (stopBtn) stopBtn.style.display = anyRunning ? "block" : "none";
          const advSubtext = document.getElementById("advisorBannerSubtext");
          if (advSubtext) {
            advSubtext.textContent = anyRunning ? "Pipeline running autonomously..." : "Chat with Advisor to configure and start";
          }
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
                linksHtml += '<button type="button" class="btn-insight-action-primary" data-action="openAdvisorTab" title="Ask Live Advisor to resolve this question">\u{1F4AC} Ask Advisor \u2197</button>';

                failInsightHtml = '<div class="task-insight-box" title="' + escapeHtml(errorText) + '">' +
                  '<div class="task-insight-header">' +
                    '<span class="task-insight-icon">\u26A0\uFE0F</span>' +
                    '<span class="task-insight-title">Action Required</span>' +
                  '</div>' +
                  '<div class="task-insight-body">' + escapeHtml(shortMsg) + '</div>' +
                  (linksHtml ? ('<div class="task-insight-actions">' + linksHtml + '</div>') : '') +
                '</div>';
              }

              const phaseDir = safeTaskName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
              const hasRun = rawStatus === "completed" || rawStatus === "failed" || rawStatus === "running";
              const logBtnClass = hasRun ? "task-action-icon-btn has-run" : "task-action-icon-btn";
              const chatIconHtml = '<button type="button" class="' + logBtnClass + '" data-action="openFile" data-path="logs/' + phaseDir + '/chat.md" title="Open chat trace (logs/' + phaseDir + '/chat.md)">' + (ICONS["chat"] || ICONS["chate"] || "") + '</button>';
              const termIconHtml = '<button type="button" class="' + logBtnClass + '" data-action="openFile" data-path="logs/' + phaseDir + '/console.log" title="Open console output (logs/' + phaseDir + '/console.log)">' + (ICONS["terminal"] || "") + '</button>';
              const iconLinksHtml = '<span class="task-action-icons">' + chatIconHtml + termIconHtml + '</span>';

              phaseHtml += '<div class="' + cardClass + '"' + startTimeAttr + '>' +
                '<div class="task-main-row">' +
                  '<div class="task-left">' +
                    '<input type="checkbox" ' + checked + ' data-phase-id="' + escapeHtml(p.id) + '" title="Include in pipeline" ' + (anyRunning ? "disabled" : "") + ' />' +
                    '<span class="task-name" data-action="openPhase" data-file="' + safeFileName + '" title="Click to edit ' + safeFileName + ' in VS Code">' + safeTaskName + '</span>' +
                  '</div>' +
                  '<div class="task-right">' +
                    '<span class="' + badgeClass + '">' + escapeHtml(displayStatus) + '</span>' +
                    iconLinksHtml +
                    '<span class="task-duration">' + escapeHtml(durationText) + '</span>' +
                  '</div>' +
                '</div>' +
                failInsightHtml +
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

    // ==========================================
    // Live Advisor Chat Client Implementation
    // ==========================================
    const advisorThread = document.getElementById("advisorThread");
    const advisorInput = document.getElementById("advisorInput");
    const advisorSendBtn = document.getElementById("advisorSendBtn");
    const advisorStopBtn = document.getElementById("advisorStopBtn");
    const advisorClearBtn = document.getElementById("advisorClearBtn");
    const chatIndicator = document.getElementById("chatIndicator");

    let isAdvisorGenerating = false;
    let currentStreamingMsgElement = null;
    let accumulatedStreamingText = "";

    function formatAdvisorMarkdown(text) {
      if (!text) return "";
      let escaped = escapeHtml(text);
      const BT = String.fromCharCode(96);
      const BT3 = BT + BT + BT;

      // Code blocks
      escaped = escaped.replace(new RegExp(BT3 + "([a-zA-Z0-9_-]*)\\n([\\s\\S]*?)" + BT3, "g"), function (match, lang, code) {
        return '<pre><code>' + code + '</code></pre>';
      });

      // Inline code
      escaped = escaped.replace(new RegExp(BT + "([^" + BT + "\\n]+)" + BT, "g"), '<code>$1</code>');

      // Bold
      escaped = escaped.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');

      // Convert file links or mentions to clickable buttons
      escaped = escaped.replace(/\\b(docs\\/(?:experiment|notes|llm|literature_database)\\.md)\\b/g, function (match, p1) {
        return '<button type="button" class="btn-insight-link" data-action="openFile" data-path="' + p1 + '" style="font-size:10px; padding:1px 5px; margin:0 2px;">' + p1 + ' \u2197</button>';
      });

      // Convert newlines (outside of pre)
      const parts = escaped.split(/(<pre>[\\s\\S]*?<\\/pre>)/g);
      for (let i = 0; i < parts.length; i++) {
        if (!parts[i].startsWith('<pre>')) {
          parts[i] = parts[i].split(String.fromCharCode(10)).join('<br>');
        }
      }
      return parts.join('');
    }

    function scrollAdvisorToBottom() {
      if (advisorThread) {
        advisorThread.scrollTop = advisorThread.scrollHeight;
      }
    }

    function setAdvisorGenerating(generating) {
      isAdvisorGenerating = !!generating;
      if (advisorSendBtn) advisorSendBtn.style.display = isAdvisorGenerating ? "none" : "inline-flex";
      if (advisorStopBtn) advisorStopBtn.style.display = isAdvisorGenerating ? "inline-flex" : "none";
      if (chatIndicator) chatIndicator.className = isAdvisorGenerating ? "tab-indicator running" : "tab-indicator";
    }

    function renderAdvisorState(messages, isGenerating) {
      setAdvisorGenerating(isGenerating);
      if (!advisorThread) return;

      if (!messages || messages.length === 0) {
        advisorThread.innerHTML = '<div class="advisor-msg assistant">' +
          '<div class="advisor-avatar">' + (ICONS["robot"] || "\u{1F916}") + '</div>' +
          '<div class="advisor-bubble">' +
            '<div class="advisor-msg-title">TidyProteomics Live Advisor</div>' +
            '<div class="advisor-msg-body">' +
              'Hello! I am your live proteomics advisor. I monitor your experimental design in <code>docs/experiment.md</code>, pipeline execution status, and findings in <code>docs/notes.md</code>.<br><br>' +
              'Feel free to ask questions about sample grouping, confounding warnings, normalization, differential expression, or biological pathways.' +
            '</div>' +
          '</div>' +
        '</div>';
        return;
      }

      let html = "";
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const isUser = m.role === "user";
        const avatar = isUser ? "\u{1F464}" : (ICONS["robot"] || "\u{1F916}");
        const sender = isUser ? "You" : "TidyProteomics Advisor";
        const time = m.timestamp ? ' <span style="font-size:8.5px; opacity:0.6; font-weight:normal;">' + escapeHtml(m.timestamp) + '</span>' : '';
        const body = formatAdvisorMarkdown(m.content);

        let chipsHtml = "";
        if (m.quickChips && m.quickChips.length > 0) {
          chipsHtml = '<div class="advisor-msg-chips">';
          for (let c = 0; c < m.quickChips.length; c++) {
            const chipText = escapeHtml(m.quickChips[c]);
            chipsHtml += '<button type="button" class="advisor-msg-chip" data-chip="' + chipText + '">' + chipText + '</button>';
          }
          chipsHtml += '</div>';
        }

        html += '<div class="advisor-msg ' + (isUser ? 'user' : 'assistant') + '">' +
          '<div class="advisor-avatar">' + avatar + '</div>' +
          '<div class="advisor-bubble">' +
            '<div class="advisor-msg-title">' + sender + time + '</div>' +
            '<div class="advisor-msg-body">' + body + '</div>' +
            chipsHtml +
          '</div>' +
        '</div>';
      }
      advisorThread.innerHTML = html;
      scrollAdvisorToBottom();
    }

    function appendAdvisorChunk(chunk) {
      if (!advisorThread) return;
      accumulatedStreamingText += chunk;

      if (!currentStreamingMsgElement) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "advisor-msg assistant";
        msgDiv.innerHTML = '<div class="advisor-avatar">' + (ICONS["robot"] || "\u{1F916}") + '</div>' +
          '<div class="advisor-bubble">' +
            '<div class="advisor-msg-title">TidyProteomics Advisor <span style="font-size:8.5px; opacity:0.6; font-weight:normal;">Thinking...</span></div>' +
            '<div class="advisor-msg-body"></div>' +
          '</div>';
        advisorThread.appendChild(msgDiv);
        currentStreamingMsgElement = msgDiv;
      }

      const bodyEl = currentStreamingMsgElement.querySelector(".advisor-msg-body");
      if (bodyEl) {
        bodyEl.innerHTML = formatAdvisorMarkdown(accumulatedStreamingText) + '<span class="advisor-streaming-cursor"></span>';
      }
      scrollAdvisorToBottom();
    }

    function completeAdvisorResponse(fullText, usage, messages) {
      currentStreamingMsgElement = null;
      accumulatedStreamingText = "";
      setAdvisorGenerating(false);
      if (messages && messages.length > 0) {
        renderAdvisorState(messages, false);
      }
    }

    function showAdvisorError(error) {
      currentStreamingMsgElement = null;
      accumulatedStreamingText = "";
      setAdvisorGenerating(false);
      if (!advisorThread) return;
      const errDiv = document.createElement("div");
      errDiv.className = "advisor-msg assistant";
      errDiv.innerHTML = '<div class="advisor-avatar">\u26A0\uFE0F</div>' +
        '<div class="advisor-bubble" style="border-color:var(--error); background:rgba(239, 68, 68, 0.1);">' +
          '<div class="advisor-msg-title" style="color:var(--error);">Advisor Error</div>' +
          '<div class="advisor-msg-body">' + escapeHtml(error) + '</div>' +
        '</div>';
      advisorThread.appendChild(errDiv);
      scrollAdvisorToBottom();
    }

    function sendAdvisorPrompt(text) {
      const prompt = (text || (advisorInput ? advisorInput.value : "")).trim();
      if (!prompt || isAdvisorGenerating) return;

      if (advisorInput) {
        advisorInput.value = "";
        advisorInput.style.height = "auto";
      }

      setAdvisorGenerating(true);
      accumulatedStreamingText = "";
      currentStreamingMsgElement = null;

      // Optimistically append user message
      if (advisorThread) {
        const userDiv = document.createElement("div");
        userDiv.className = "advisor-msg user";
        userDiv.innerHTML = '<div class="advisor-avatar">\u{1F464}</div>' +
          '<div class="advisor-bubble">' +
            '<div class="advisor-msg-title">You</div>' +
            '<div class="advisor-msg-body">' + formatAdvisorMarkdown(prompt) + '</div>' +
          '</div>';
        advisorThread.appendChild(userDiv);
        scrollAdvisorToBottom();
      }

      vscode.postMessage({ type: "advisorSendMessage", text: prompt });
    }

    if (advisorSendBtn) {
      advisorSendBtn.addEventListener("click", function () {
        sendAdvisorPrompt();
      });
    }

    if (advisorStopBtn) {
      advisorStopBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "advisorStop" });
        setAdvisorGenerating(false);
      });
    }

    if (advisorClearBtn) {
      advisorClearBtn.addEventListener("click", function () {
        vscode.postMessage({ type: "advisorClear" });
      });
    }

    if (advisorInput) {
      advisorInput.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = Math.min(this.scrollHeight, 120) + "px";
      });

      advisorInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendAdvisorPrompt();
        }
      });
    }

    // Quick suggestion chips and message chips handler
    document.addEventListener("click", function (e) {
      const chip = e.target.closest ? e.target.closest(".advisor-chip") : null;
      if (chip) {
        const prompt = chip.getAttribute("data-prompt");
        if (prompt) {
          sendAdvisorPrompt(prompt);
        }
        return;
      }

      const msgChip = e.target.closest ? e.target.closest(".advisor-msg-chip") : null;
      if (msgChip) {
        const chipText = msgChip.getAttribute("data-chip");
        if (chipText === "Select File...") {
          vscode.postMessage({ type: "advisorPickDataFile" });
        } else if (chipText === "Review docs/experiment.md \u2197" || chipText === "View docs/experiment.md \u2197") {
          vscode.postMessage({ type: "openFile", relPath: "docs/experiment.md" });
        } else if (chipText === "Switch to Provider Tab \u2197") {
          switchTab("provider");
        } else if (chipText) {
          sendAdvisorPrompt(chipText);
        }
        return;
      }
    });

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
        } else if (message.type === "advisorState") {
          renderAdvisorState(message.messages, message.isGenerating);
        } else if (message.type === "advisorChunk") {
          appendAdvisorChunk(message.chunk);
        } else if (message.type === "advisorDone") {
          completeAdvisorResponse(message.reply, message.usage, message.messages);
        } else if (message.type === "advisorError") {
          showAdvisorError(message.error);
        }
      } catch (err) {
        console.error("[TidyProteomicsAgent] Error in webview message handler:", err);
      }
    });

    // Request initial state proactively
    vscode.postMessage({ type: "requestState" });
    vscode.postMessage({ type: "advisorGetState" });
    setTimeout(function () {
      vscode.postMessage({ type: "requestState" });
      vscode.postMessage({ type: "advisorGetState" });
    }, 200);
  </script>
</body>
</html>`}};function Xe(v){console.log("TidyProteomicsAgent extension is now active!");let e=_.window.createOutputChannel("TidyProteomicsAgent");v.subscriptions.push(e);let s=a=>{let r=a?.stack||String(a);typeof r=="string"&&(r.includes("Missing dataLength in event")||r.includes("strict mode functions"))||(e.appendLine(`[UNCAUGHT EXCEPTION] ${r}`),console.error("[TidyProteomicsAgent UNCAUGHT EXCEPTION]",a))},t=a=>{let r=a?.stack||String(a);typeof r=="string"&&(r.includes("Missing dataLength in event")||r.includes("strict mode functions"))||(e.appendLine(`[UNHANDLED REJECTION] ${r}`),console.error("[TidyProteomicsAgent UNHANDLED REJECTION]",a))};process.on("uncaughtException",s),process.on("unhandledRejection",t),v.subscriptions.push({dispose:()=>{process.removeListener("uncaughtException",s),process.removeListener("unhandledRejection",t)}});let i=new ae(v.extensionUri,v);v.subscriptions.push(_.window.registerWebviewViewProvider(ae.viewType,i));let o=[],n=a=>{for(let p of o)try{p.dispose()}catch{}o=[];let r=[];if(a)r.push(_.Uri.file(a));else{let p=_.workspace.workspaceFolders;p&&p.length>0&&r.push(...p)}if(r.length!==0)for(let p of r)try{let l=p.fsPath||p.uri?.fsPath||"";if(!l||!ee.existsSync(l))continue;let d=re.join(l,"analysis");if(ee.existsSync(d)){let g=_.workspace.createFileSystemWatcher(new _.RelativePattern(_.Uri.file(d),"*.md"));g.onDidCreate(()=>i.refreshPhases().catch(()=>{})),g.onDidChange(()=>i.refreshPhases().catch(()=>{})),g.onDidDelete(()=>i.forceReload().catch(()=>{})),o.push(g)}let c=re.join(l,"agent");if(ee.existsSync(c)){let g=_.workspace.createFileSystemWatcher(new _.RelativePattern(_.Uri.file(c),"*.md"));g.onDidCreate(()=>i.refreshPhases().catch(()=>{})),g.onDidChange(()=>i.refreshPhases().catch(()=>{})),g.onDidDelete(()=>i.refreshPhases().catch(()=>{})),o.push(g)}let f=re.join(l,"prompts");if(ee.existsSync(f)){let g=_.workspace.createFileSystemWatcher(new _.RelativePattern(_.Uri.file(f),"*.md"));g.onDidCreate(()=>i.refreshPhases().catch(()=>{})),g.onDidChange(()=>i.refreshPhases().catch(()=>{})),g.onDidDelete(()=>i.refreshPhases().catch(()=>{})),o.push(g)}let m=re.join(l,"docs");if(ee.existsSync(m)){let g=_.workspace.createFileSystemWatcher(new _.RelativePattern(_.Uri.file(m),"notes.md"));g.onDidCreate(()=>i.forceReload().catch(()=>{})),g.onDidChange(()=>i.forceReload().catch(()=>{})),g.onDidDelete(()=>i.forceReload().catch(()=>{})),o.push(g)}}catch(l){let d=p.fsPath||p.uri?.fsPath||"";console.error("[TidyProteomicsAgent] Failed to initialize file watchers for folder:",d,l)}};i.onFolderChangedCallback=a=>{n(a)},n(),v.subscriptions.push(_.workspace.onDidChangeWorkspaceFolders(()=>{n(),i.onWorkspaceChanged().catch(()=>{})})),v.subscriptions.push({dispose:()=>{for(let a of o)try{a.dispose()}catch{}o=[]}}),v.subscriptions.push(_.commands.registerCommand("tidyproteomicsagent.startPipeline",()=>{i.startPipeline()})),v.subscriptions.push(_.commands.registerCommand("tidyproteomicsagent.runCurrentPhase",()=>{i.runSelectedPhase().catch(a=>{_.window.showErrorMessage(`TidyProteomicsAgent: ${a.message||String(a)}`)})})),v.subscriptions.push(_.commands.registerCommand("tidyproteomicsagent.refreshTasks",()=>{i.forceReload()})),v.subscriptions.push(_.commands.registerCommand("tidyproteomicsagent.resetState",async()=>{await _.window.showWarningMessage("Are you sure you want to reset the pipeline state in docs/notes.md?",{modal:!0},"Yes","Cancel")==="Yes"&&(await i.resetAllState(),_.window.showInformationMessage("TidyProteomicsAgent: Pipeline state reset."))})),v.subscriptions.push(_.commands.registerCommand("tidyproteomicsagent.initWorkspace",async()=>{await i.promptInitWorkspace()}))}function Ze(){}0&&(module.exports={activate,deactivate});
