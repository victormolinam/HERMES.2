const fs = require('fs');
let code = fs.readFileSync('src/components/MissionControl.tsx', 'utf8');

const oldBlock = `      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rocket Parameters */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="py-2 px-3 bg-muted/50 border-b border-border flex flex-row items-center justify-between">`;

const newBlock = `      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
        {/* Rocket Parameters */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="py-2 px-3 bg-muted/50 border-b border-border flex flex-row items-center justify-between">`;

const oldBlockEnd = `            <NumberInputMC
              label={t.launch_temp || "Launch Temp [ºC]"}
              value={launchTemp}
              onChange={setLaunchTemp}
              step="0.1"
            />
          </CardContent>
        </Card>

        {/* Experimental Data Upload */}`;

const newBlockEnd = `            <NumberInputMC
              label={t.launch_temp || "Launch Temp [ºC]"}
              value={launchTemp}
              onChange={setLaunchTemp}
              step="0.1"
            />
          </CardContent>
        </Card>
        
        {/* Aerodynamic Data */}
        <Card className="bg-card border-border shadow-sm flex-1">
          <CardHeader className="py-2 px-3 bg-muted/50 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-[12px] uppercase text-muted-foreground font-bold">
              {lang === "es" ? "Datos Aerodinámicos" : "Aerodynamic Data"}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <UiLabel htmlFor="use-aero" className="text-[10px] uppercase font-bold text-muted-foreground">
                {lang === "es" ? "Usar Personalizado" : "Use Custom"}
              </UiLabel>
              <Checkbox id="use-aero" checked={useAeroData} onCheckedChange={(v) => setUseAeroData(!!v)} />
            </div>
          </CardHeader>
          <CardContent className="p-3 flex flex-col gap-2">
             <div className="flex justify-between items-center">
                 <p className="text-[10px] text-muted-foreground leading-snug flex-1 pr-4">
                   {lang === "es" 
                     ? "Opcional. Pega los datos del coeficiente de resistencia en columnas (Mach, Cd) desde Excel o CSV. Si no proporcionas datos o desmarcas la casilla, se utilizará una curva aerodinámica supersónica por defecto." 
                     : "Optional. Paste drag coefficient data in columns (Mach, Cd) from Excel or CSV. If unselected or empty, a default supersonic aerodynamic curve will be used."}
                 </p>
                 <Button
                    size="sm"
                    onClick={handleUpdate}
                    disabled={!hasChanges || isUpdating}
                    variant={hasChanges ? "default" : "secondary"}
                    className="h-6 text-[10px] px-2 py-0 shrink-0"
                  >
                    {isUpdating ? "..." : t.update_btn || "Actualizar"}
                  </Button>
             </div>
             
             {useAeroData && (
                <div className="mt-2 flex-1 min-h-[120px] flex flex-col relative">
                   <textarea
                     className="w-full h-full min-h-[150px] p-2 text-xs font-mono bg-muted/30 border border-border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
                     placeholder={lang === "es" ? "0.0\\t0.45\\n0.2\\t0.45\\n0.8\\t0.46\\n1.0\\t0.61\\n2.0\\t0.48..." : "0.0\\t0.45\\n0.2\\t0.45\\n0.8\\t0.46\\n1.0\\t0.61\\n2.0\\t0.48..."}
                     value={aeroDataRaw}
                     onChange={(e) => setAeroDataRaw(e.target.value)}
                   />
                   {aeroParsed && (
                     <div className="absolute bottom-2 right-2 px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold rounded flex items-center gap-1 border border-emerald-500/30">
                        <CheckCircle2 size={10} />
                        {aeroParsed.mach.length} pts
                     </div>
                   )}
                </div>
             )}
          </CardContent>
        </Card>
        </div>

        {/* Experimental Data Upload */}`;

code = code.replace(oldBlock, newBlock);
code = code.replace(oldBlockEnd, newBlockEnd);

fs.writeFileSync('src/components/MissionControl.tsx', code);
console.log('Patched layout.');
