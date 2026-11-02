const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
code = code.replace(
  'import { Download, Monitor, Sun, Moon, User, HelpCircle, BookOpen, FolderOpen, Trash2, Folder } from \'lucide-react\';',
  'import { Download, Monitor, Sun, Moon, User, HelpCircle, BookOpen, FolderOpen, Trash2, Folder, Wrench } from \'lucide-react\';'
);

// Add Tab Triggers
const oldTriggers = `<TabsTrigger value="mission_control" className={\`font-bold text-xs \${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}\`}>{t.mission_control || "Mission Control"}</TabsTrigger>
              <TabsTrigger value="cfd" disabled={!results} className={\`font-bold text-xs \${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}\`}>{t.cfd || "CFD Animation"}</TabsTrigger>`;

const newTriggers = `<TabsTrigger value="mission_control" className={\`font-bold text-xs \${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}\`}>{t.mission_control || "Mission Control"}</TabsTrigger>
              <TabsTrigger value="smart_search" className={\`font-bold text-xs \${theme === 'light' ? 'data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-700 data-[state=active]:outline data-[state=active]:outline-2 data-[state=active]:outline-yellow-500' : 'data-[state=active]:bg-yellow-900/30 data-[state=active]:text-yellow-400 data-[state=active]:outline data-[state=active]:outline-2 data-[state=active]:outline-yellow-500'}\`}>Smart Search</TabsTrigger>
              <TabsTrigger value="agente_jesus" className={\`font-bold text-xs \${theme === 'light' ? 'data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-700 data-[state=active]:outline data-[state=active]:outline-2 data-[state=active]:outline-yellow-500' : 'data-[state=active]:bg-yellow-900/30 data-[state=active]:text-yellow-400 data-[state=active]:outline data-[state=active]:outline-2 data-[state=active]:outline-yellow-500'}\`}>Agente Jesús</TabsTrigger>
              <TabsTrigger value="cfd" disabled={!results} className={\`font-bold text-xs \${theme === 'light' ? 'data-[state=active]:bg-[#faf9f6]/95 data-[state=active]:text-indigo-600' : 'data-[state=active]:bg-slate-950 data-[state=active]:text-purple-400'}\`}>{t.cfd || "CFD Animation"}</TabsTrigger>`;

code = code.replace(oldTriggers, newTriggers);

// Add Tab Contents
const oldContentsEnd = `<TabsContent value="mission_control" className="flex-1 flex flex-col min-h-0 gap-2 px-1 overflow-y-auto pt-2">
             <MissionControl 
                results={results} 
                motor={{...motor, grains}} 
                nozzle={nozzle} 
                lang={lang}
             />
          </TabsContent>
        </Tabs>`;

const newContentsEnd = `<TabsContent value="mission_control" className="flex-1 flex flex-col min-h-0 gap-2 px-1 overflow-y-auto pt-2">
             <MissionControl 
                results={results} 
                motor={{...motor, grains}} 
                nozzle={nozzle} 
                lang={lang}
             />
          </TabsContent>
          
          <TabsContent value="smart_search" className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-2xl text-center flex flex-col items-center gap-6 border-2 border-dashed border-yellow-500/50 p-10 rounded-xl bg-yellow-500/5">
               <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-2">
                  <Wrench size={40} />
               </div>
               <h2 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {lang === 'es' ? 'En Mantenimiento' : 'Under Maintenance'}
               </h2>
               <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed text-left">
                 {lang === 'es' 
                    ? 'Esta función aún no está en fase beta. Actualmente se encuentra en construcción.' 
                    : 'This feature is not yet in beta phase. It is currently under construction.'}
                 <br/><br/>
                 <strong className="text-yellow-600 dark:text-yellow-400 text-lg">
                    {lang === 'es' ? 'Concepto de Smart Search:' : 'Smart Search Concept:'}
                 </strong>
                 <br/>
                 {lang === 'es'
                    ? 'Queremos implementar algoritmos avanzados para encontrar la solución óptima entre todas las posibilidades. Por ejemplo, si deseas alcanzar una altitud de 1 km con tu cohete, esta herramienta te dirá la configuración exacta de granos que debes aplicar, teniendo en cuenta diversas restricciones en la cámara de combustión y en la tobera.'
                    : 'We plan to implement advanced algorithms to find optimal solutions from all possibilities. For example, if you want to achieve an altitude of 1 km with your rocket, this tool will tell you the exact grain configuration you should apply, while taking into account various constraints in the combustion chamber and nozzle.'}
               </p>
            </div>
          </TabsContent>

          <TabsContent value="agente_jesus" className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-2xl text-center flex flex-col items-center gap-6 border-2 border-dashed border-yellow-500/50 p-10 rounded-xl bg-yellow-500/5">
               <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-2">
                  <Wrench size={40} />
               </div>
               <h2 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {lang === 'es' ? 'En Mantenimiento' : 'Under Maintenance'}
               </h2>
               <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed text-left">
                 {lang === 'es' 
                    ? 'Esta función aún no está en fase beta. Actualmente se encuentra en construcción.' 
                    : 'This feature is not yet in beta phase. It is currently under construction.'}
                 <br/><br/>
                 <strong className="text-yellow-600 dark:text-yellow-400 text-lg">
                    {lang === 'es' ? 'Concepto del Agente Jesús:' : 'Agente Jesús Concept:'}
                 </strong>
                 <br/>
                 {lang === 'es'
                    ? 'Un agente de IA local, gratuito y opcional especializado en cohetería. Ayudará a los usuarios a comprender mejor la física, analizar los resultados de simulación y ofrecerá consejos si algo parece extraño o subóptimo. La aplicación principal funcionará exactamente igual con o sin descargar esta IA.'
                    : 'An optional, free, local AI agent specialized in rocketry. It will help users understand the physics, analyze simulation results, and provide tips if something looks strange or sub-optimal in the results. The core app remains exactly the same with or without downloading this AI.'}
               </p>
            </div>
          </TabsContent>
          
        </Tabs>`;

code = code.replace(oldContentsEnd, newContentsEnd);

fs.writeFileSync('src/App.tsx', code);
console.log('patched tabs');
