import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './App.css';

// --- 1. DIZIONARIO TRADUZIONI (i18n) ---
const TRANSLATIONS = {
  it: {
    selectWorkout: "Seleziona allenamento",
    sessionInProgress: "Sessione in corso",
    configTitle: "Configura Allenamenti",
    historyTitle: "Storico Sessioni",
    analyticsTitle: "Andamento Esercizi",
    savedAlert: "✓ Salvato",
    saveSession: "SALVA SESSIONE",
    sessionSaved: "✓ SALVATO",
    noSessions: "Nessuna sessione salvata ancora.",
    btnNew: "+ Nuovo",
    btnImport: "📥 Importa",
    btnExportBackup: "📤 ESPORTA BACKUP",
    btnImportBackup: "📥 IMPORTA BACKUP",
    confirmDeleteWorkout: "Eliminare l'allenamento? L'operazione è irreversibile.",
    confirmDeleteCircuit: "Eliminare il circuito?",
    confirmResetSession: "Vuoi azzerare la sessione in corso e ripartire dal programma originale?",
    confirmDeleteHistory: "Sei sicuro di voler cancellare questo allenamento?",
    recComplete: "RECUPERO COMPLETATO!",
    recActive: "RECUPERO: ",
    totalLoad: "Carico Totale",
    seriesTag: "SERIE",
    timerStatusOn: "⏱ TEMPI RECUPERO: ATTIVI",
    timerStatusOff: "⏱ TEMPI RECUPERO: ESCLUSI",
    timerDeactivate: "DISATTIVA",
    timerActivate: "ATTIVA",
    instructionsSession: "Tocca una serie per completarla o modifica peso/rip per auto-completarla",
    notesPlaceholder: "Note…",
    historiqueLabel: "storico",
    setsLabel: "SERIE",
    exercisePlaceholder: "Nome esercizio",
    restPlaceholder: "Es. 90",
    confirmDeleteEx: "Eliminare questo esercizio?",
    addExercise: "Aggiungi Esercizio",
    addCircuit: "+ AGGIUNGI CIRCUITO"
  },
  en: {
    selectWorkout: "Select workout",
    sessionInProgress: "Session in progress",
    configTitle: "Configure Workouts",
    historyTitle: "Session History",
    analyticsTitle: "Exercise Progress",
    savedAlert: "✓ Saved",
    saveSession: "SAVE SESSION",
    sessionSaved: "✓ SAVED",
    noSessions: "No sessions saved yet.",
    btnNew: "+ New",
    btnImport: "📥 Import",
    btnExportBackup: "📤 EXPORT BACKUP",
    btnImportBackup: "📥 IMPORT BACKUP",
    confirmDeleteWorkout: "Delete this workout? This action cannot be undone.",
    confirmDeleteCircuit: "Delete this circuit?",
    confirmResetSession: "Do you want to reset the current session and restart from the original program?",
    confirmDeleteHistory: "Are you sure you want to delete this workout?",
    recComplete: "REST COMPLETED!",
    recActive: "REST: ",
    totalLoad: "Total Load",
    seriesTag: "SETS",
    timerStatusOn: "⏱ REST TIME: ACTIVE",
    timerStatusOff: "⏱ REST TIME: DISABLED",
    timerDeactivate: "DISABLE",
    timerActivate: "ENABLE",
    instructionsSession: "Tap a set to complete it or edit weight/reps to auto-complete",
    notesPlaceholder: "Notes…",
    historiqueLabel: "history",
    setsLabel: "SETS",
    exercisePlaceholder: "Exercise name",
    restPlaceholder: "E.g. 90",
    confirmDeleteEx: "Delete this exercise?",
    addExercise: "Add Exercise",
    addCircuit: "+ ADD CIRCUIT"
  }
};

// --- 2. LOGICA DI AUTOMATISMO LINGUA ---
const userLang = navigator.language.startsWith('it') ? 'it' : 'en';
const t = (key) => TRANSLATIONS[userLang]?.[key] || key;

// --- 3. LE TUE UTILITY E COSTANTI ORIGINALI ---
const KEYS = { W: 'gl_workouts', S: 'gl_sessions', T: 'gl_timer_master' };
const lsGet = k => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch{return null;} };
const lsSet = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch{} };
const uid = () => Math.random().toString(36).slice(2,9);

const DEFAULT_WORKOUTS = [
  {
    id:'w1', name:'Allenamento 1',
    circuits:[
      { id:'c1', name:'Circuito 1', exercises:[
        {id:'e1',name:'Leg Press',sets:4,baseWeights:['20','20','20','40'],baseReps:['10','10','10','8'],restTime:'90'},
        {id:'e2',name:'Alzate laterali',sets:4,baseWeights:['10','12','12','12'],baseReps:['10','10','10','10'],restTime:'60'},
      ]},
    ]
  }
];

const S = {
  input: {
    background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'4px',
    color:'#f0f0f0', padding:'8px 10px', fontSize:'0.9rem',
    outline:'none', width:'100%',
  },
  tag: {
    background:'#e8ff47', color:'#0a0a0a', fontSize:'0.85rem',
    fontWeight:800, padding:'3px 9px', borderRadius:'2px',
    letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap',
  },
  sectionTitle: {
    fontSize:'0.95rem', fontWeight:900, letterSpacing:'0.15em',
    color:'#e8ff47', textTransform:'uppercase', marginBottom:'14px',
    paddingBottom:'8px', borderBottom:'1px solid #1e1e1e',
  },
  secondaryBtn: {
    flex:1, background:'#141414', border:'1px solid #333', borderRadius:'8px',
    color:'#fff', padding:'16px 8px', fontWeight:800, fontSize:'0.95rem',
    cursor:'pointer', letterSpacing:'0.05em', textAlign:'center'
  },
};
const calculateExerciseVolume = (exData, baseReps = [], baseWeights = []) => {
  if (!exData) return 0;
  const actWeights = exData.actWeights;
  const weights = exData.weights || baseWeights;
  const actReps = exData.actReps || [];
  let vol = 0;
  const numSets = baseWeights.length > 0 ? baseWeights.length : weights.length;
  for(let i=0; i<numSets; i++) {
    let wStr = weights[i];
    if (actWeights && actWeights[i] !== '' && actWeights[i] !== undefined) {
      wStr = actWeights[i];
    }
    const weight = parseFloat(wStr) || 0;
    const repsStr = actReps[i];
    const defaultRep = parseInt(baseReps[i]) || 0;
    const reps = (repsStr !== undefined && repsStr !== '') ? (parseInt(repsStr) || 0) : defaultRep;
    vol += weight * reps;
  }
  return vol;
};

const calculateSessionVolume = (sessionData, workouts) => {
  let totalVolume = 0;
  if (!sessionData || !sessionData.data) return 0;
  const workout = workouts ? workouts.find(w => w.id === sessionData.workoutId) : null;
  Object.entries(sessionData.data).forEach(([exId, exData]) => {
    let baseReps = [];
    let baseWeights = [];
    if (workout) {
      for (const c of workout.circuits) {
        const found = c.exercises.find(e => e.id === exId);
        if (found) { baseReps = found.baseReps || []; baseWeights = found.baseWeights || []; break; }
      }
    }
    totalVolume += calculateExerciseVolume(exData, baseReps, baseWeights);
  });
  return totalVolume;
};

function BackBtn({onClick}) {
  return <button onClick={onClick} style={{
    background:'none',border:'none',cursor:'pointer',color:'#e8ff47',
    fontSize:'1.4rem',padding:'4px 8px 4px 0',lineHeight:1,flexShrink:0,
  }}>←</button>;
}

// Contesto audio globale per persistere tra i montaggi/smontaggi del componente
const globalAudioCtx = { current: null };

function FloatingTimer({ duration, onCancel, triggerKey }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const wakeLockRef = React.useRef(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (e) {}
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (e) {}
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const showIOSWarning = () => {
    if (isIOS && !localStorage.getItem('gl_ios_timer_warned')) {
      localStorage.setItem('gl_ios_timer_warned', '1');
      alert(userLang === 'it' 
        ? '⚠️ Su iPhone il timer si interrompe se lo schermo si spegne.\nTieni lo schermo acceso durante il recupero.' 
        : '⚠️ On iPhone, the timer stops if the screen turns off.\nKeep the screen active during rest.');
    }
  };

  useEffect(() => {
    setTimeLeft(duration);
    requestWakeLock();
    showIOSWarning();
    return () => releaseWakeLock();
  }, [duration, triggerKey]);

  useEffect(() => {
    if (timeLeft <= 0) {
      releaseWakeLock();
      
      // Inizializzazione sicura del contesto globale
      if (!globalAudioCtx.current) {
        globalAudioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Sblocco audio per iOS
      if (globalAudioCtx.current.state === 'suspended') {
        globalAudioCtx.current.resume();
      }

      try {
        const osc = globalAudioCtx.current.createOscillator();
        const gain = globalAudioCtx.current.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, globalAudioCtx.current.currentTime);
        gain.gain.setValueAtTime(0.3, globalAudioCtx.current.currentTime);
        osc.connect(gain);
        gain.connect(globalAudioCtx.current.destination);
        osc.start();
        osc.stop(globalAudioCtx.current.currentTime + 0.4);
      } catch (e) {
        console.error("Audio error:", e);
      }
      return;
    }
    
    const timer = setTimeout(() => { setTimeLeft(timeLeft - 1); }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0) {
      const autoClose = setTimeout(() => {
        onCancel();
      }, 3000);
      return () => clearTimeout(autoClose);
    }
  }, [timeLeft, onCancel]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (timeLeft <= 0) {
    return (
      <div style={{
        position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
        background:'#22c55e', color:'#0a0a0a', padding:'12px 24px', borderRadius:'30px',
        fontWeight:900, fontSize:'1.1rem', zIndex:1000, boxShadow:'0 4px 20px rgba(34,197,94,0.4)',
        display:'flex', alignItems:'center', gap:'12px', letterSpacing:'0.05em', cursor:'pointer'
      }} onClick={onCancel}>
        <span>{t('recComplete')}</span>
        <span style={{background:'#0a0a0a', color:'#fff', borderRadius:'50%', width:'24px', height:'24px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem'}}>✕</span>
      </div>
    );
  }

  return (
    <div className="timer-pulse" style={{
      position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
      background:'#e8ff47', color:'#0a0a0a', padding:'12px 24px', borderRadius:'30px',
      fontWeight:900, fontSize:'1.1rem', zIndex:1000, boxShadow:'0 4px 20px rgba(232,255,71,0.4)',
      display:'flex', alignItems:'center', gap:'16px'
    }}>
      <span>{t('recActive')}{formatTime(timeLeft)}</span>
      <button onClick={onCancel} style={{
        background:'#0a0a0a', color:'#fff', border:'none', borderRadius:'50%',
        width:'24px', height:'24px', fontWeight:700, fontSize:'0.75rem', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center'
      }}>✕</button>
    </div>
  );
}
const IconSave = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

const IconCheck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// --- COMPONENTI ESTRATTI PER IL REFACTORING (Punto 4 + Risc) ---
const SetHeaderCell = React.memo(({ index, isCompleted, isWarmup, warmupCount, onToggle }) => {
  const displayIndex = isWarmup ? index + 1 : index + 1 - warmupCount;
  const label = isWarmup ? `RISC ${displayIndex}` : `SERIE ${displayIndex}`;
  
  // Colori: Arancione solo se è riscaldamento, altrimenti grigio/neutro
  const activeBg = isWarmup ? '#fb923c' : '#e8ff47';
  const activeBorder = isWarmup ? '#fb923c' : '#e8ff47';
  
  // Uniformiamo il bordo: 1px come nelle celle input kg/rip
  const borderStyle = isCompleted 
    ? `1px solid ${activeBorder}` 
    : (isWarmup ? '1px solid #fb923c' : '1px solid #333');

  return (
    <div onClick={() => onToggle(index)} style={{
      flex:1, textAlign:'center', fontSize: '0.78rem', // Font size uniformato
      color: isCompleted ? '#0a0a0a' : (isWarmup ? '#fb923c' : '#aaa'),
      fontWeight:900, cursor:'pointer',
      padding:'6px 2px', borderRadius:'4px',
      background: isCompleted ? activeBg : '#1a1a1a',
      border: borderStyle,
      letterSpacing:'0.03em', transition:'background 0.15s, color 0.15s, border 0.15s', userSelect:'none'
    }}>
      {label}
    </div>
  );
});

const WeightInputCell = React.memo(({ index, actualKg, targetKg, prevWDisp, prevR, isCompleted, isWarmup, onChange }) => {
  const hasValue = actualKg !== '' && actualKg !== undefined;
  const actKgNum = parseFloat(actualKg);
  const tgtKgNum = parseFloat(targetKg);
  const currentKgColor = hasValue
    ? (actKgNum < tgtKgNum ? '#ff4747' : (actKgNum > tgtKgNum ? '#4ade80' : '#aaa'))
    : '#aaa';
  const hasPrev = prevWDisp !== undefined && prevWDisp !== '';

  // Logica Colori
  const activeColor = isWarmup ? '#fb923c' : '#e8ff47';
  const activeRgba = isWarmup ? 'rgba(251, 146, 60, 0.3)' : 'rgba(232, 255, 71, 0.3)';
  const defaultBorder = isWarmup ? '1px solid rgba(251, 146, 60, 0.4)' : '1px solid #2a2a2a';

  return (
    <div style={{flex:1, minWidth:0, display:'flex', flexDirection:'column', alignItems:'center'}}>
      <div style={{minHeight:'18px', display:'flex', justifyContent:'center', alignItems:'flex-end', marginBottom:'4px'}}>
        {hasPrev && (
          <span style={{fontSize:'0.78rem', color:'#60a5fa', fontWeight:700, letterSpacing:'-0.02em'}}>
            {prevWDisp}x{prevR || '-'}
          </span>
        )}
      </div>
      <div style={{
          background:'#1a1a1a', border: isCompleted ? `2px solid ${activeColor}` : defaultBorder,
          borderRadius:'4px', padding:'8px 0', width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: isCompleted ? `0 0 6px ${activeRgba}` : 'none', transition: 'border 0.2s, box-shadow 0.2s'
      }}>
        <span style={{fontSize:'0.9rem', color:'#f0f0f0'}}>{targetKg || '—'}</span>
        <span style={{ color: currentKgColor, marginLeft: '4px', display: 'inline-flex', alignItems: 'baseline' }}>
          <input type="text" inputMode="decimal" placeholder="--" value={actualKg} onChange={e => onChange(index, e.target.value)}
            style={{ width: '4ch', background: 'none', border: 'none', color: 'inherit', fontSize: '0.9rem', fontFamily: 'inherit', padding: '0', margin: '0', textAlign: 'center', outline: 'none' }} />
        </span>
      </div>
    </div>
  );
});

const RepInputCell = React.memo(({ index, actualReps, targetReps, isCompleted, isWarmup, onChange }) => {
  const hasValue = actualReps !== '' && actualReps !== undefined;
  const actRepsNum = parseInt(actualReps);
  const tgtRepsNum = parseInt(targetReps);
  const currentRepColor = hasValue ? (actRepsNum < tgtRepsNum ? '#ff4747' : '#4ade80') : '#aaa';
  
  // Logica Colori
  const activeColor = isWarmup ? '#fb923c' : '#e8ff47';
  const activeRgba = isWarmup ? 'rgba(251, 146, 60, 0.3)' : 'rgba(232, 255, 71, 0.3)';
  const defaultBorder = isWarmup ? '1px solid rgba(251, 146, 60, 0.4)' : '1px solid #2a2a2a';

  return (
    <div style={{flex:1, textTransform:'none', textAlign:'center', minWidth:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', color:'#f0f0f0', minHeight:'24px', background:'#1a1a1a', border: isCompleted ? `2px solid ${activeColor}` : defaultBorder, borderRadius:'4px', padding:'8px 3px', boxShadow: isCompleted ? `0 0 6px ${activeRgba}` : 'none', transition: 'border 0.2s, box-shadow 0.2s'}}>
      <span>{targetReps || '—'}</span>
      <span style={{ color: currentRepColor, marginLeft: '8px', display: 'inline-flex', alignItems: 'baseline' }}>
        <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="--" value={actualReps} onChange={e => onChange(index, e.target.value)}
          style={{ width: '3ch', background: 'none', border: 'none', color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', padding: '0', margin: '0', textAlign: 'center', outline: 'none' }} />
      </span>
    </div>
  );
});
// -----------------------------------------------------------------

function SessionExerciseRow({exercise, data, lastExData, onChange, timerMasterEnabled, startTimer, onUpdateDefaults}) {
  const actWeights = data.actWeights || exercise.baseWeights.map(()=>'');
  const actReps = data.actReps || exercise.baseWeights.map(()=>'');
  const completed = data.completed || exercise.baseWeights.map(()=>false);
  const notes = data.notes || '';
  const actRestTime = data.actRestTime || '';
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  const isChanged = () => {
    if (showSavedMsg) return false;
    const weightsDiff = actWeights.some((w, i) => w !== '' && (parseFloat(w) || 0) !== (parseFloat(exercise.baseWeights[i]) || 0));
    const repsDiff = actReps.some((r, i) => r !== '' && (parseInt(r) || 0) !== (parseInt(exercise.baseReps?.[i]) || 0));
    const restDiff = actRestTime !== '' && (parseInt(actRestTime) || 0) !== (parseInt(exercise.restTime) || 0);
    return weightsDiff || repsDiff || restDiff;
  };

  const handleSaveDefaults = () => {
    const newWeights = exercise.baseWeights.map((bw, i) => actWeights[i] !== '' ? actWeights[i] : bw);
    const baseRepsArray = exercise.baseReps || exercise.baseWeights.map(() => '');
    const newReps = baseRepsArray.map((br, i) => actReps[i] !== '' ? actReps[i] : br);
    const newRest = actRestTime !== '' ? actRestTime : exercise.restTime;
    if (onUpdateDefaults) {
      onUpdateDefaults(exercise.id, newWeights, newReps, newRest);
      setShowSavedMsg(true);
      setTimeout(() => setShowSavedMsg(false), 2000);
    }
  };

  const onInputChangeSetComplete = useCallback((i) => {
    const c = [...completed];
    const alreadyCompleted = c[i];
    c[i] = true; 
    if (!alreadyCompleted && timerMasterEnabled) {
      const chosenRestTime = actRestTime !== '' ? actRestTime : exercise.restTime;
      if (chosenRestTime) startTimer(parseInt(chosenRestTime) || 0);
    }
    return c;
  }, [completed, timerMasterEnabled, actRestTime, exercise.restTime, startTimer]);

  const setAW = useCallback((i, v) => {
    const filteredValue = v.replace(/[^0-9.,]/g, '').replace(',', '.');
    const a = [...actWeights];
    a[i] = filteredValue;
    const completedState = filteredValue !== '' ? onInputChangeSetComplete(i) : completed;
    onChange({ ...data, actWeights: a, completed: completedState });
  }, [actWeights, completed, data, onChange, onInputChangeSetComplete]);

  const setR = useCallback((i, v) => {
    const filteredValue = v.replace(/[^0-9]/g, '');
    const a = [...actReps];
    a[i] = filteredValue;
    const completedState = filteredValue !== '' ? onInputChangeSetComplete(i) : completed;
    onChange({ ...data, actReps: a, completed: completedState });
  }, [actReps, completed, data, onChange, onInputChangeSetComplete]);

  const setRT = (v) => {
    const filteredValue = v.replace(/[^0-9]/g, '');
    onChange({ ...data, actRestTime: filteredValue });
  };
  
  const toggleComplete = useCallback((i) => {
    const c = [...completed];
    const targetState = !c[i];
    c[i] = targetState;
    if (targetState && timerMasterEnabled) {
      const chosenRestTime = actRestTime !== '' ? actRestTime : exercise.restTime;
      if (chosenRestTime) startTimer(parseInt(chosenRestTime) || 0);
    }
    onChange({...data, completed: c});
  }, [completed, timerMasterEnabled, actRestTime, exercise.restTime, startTimer, onChange, data]);

  const warmupCount = exercise.warmupSets || 0;

  const currentVolume = exercise.baseWeights.reduce((acc, bw, i) => {
    if (i < warmupCount) return acc;
    const wStr = actWeights[i] !== '' && actWeights[i] !== undefined ? actWeights[i] : bw;
    const weight = parseFloat(wStr) || 0;
    const repsStr = actReps[i];
    const reps = (repsStr !== undefined && repsStr !== '') ? (parseInt(repsStr) || 0) : (parseInt(exercise.baseReps?.[i]) || 0);
    return acc + (weight * reps);
  }, 0);

  const current1RM = exercise.baseWeights.reduce((max, bw, i) => {
    const wStr = actWeights[i] !== '' && actWeights[i] !== undefined ? actWeights[i] : bw;
    const weight = parseFloat(wStr) || 0;
    const repsStr = actReps[i];
    const reps = (repsStr !== undefined && repsStr !== '') ? (parseInt(repsStr) || 0) : (parseInt(exercise.baseReps?.[i]) || 0);
    if (weight <= 0 || reps <= 0) return max;
    const epley = reps === 1 ? weight : weight * (1 + reps / 30);
    return epley > max ? epley : max;
  }, 0);

  return (
    <div style={{ padding: '0' }}> 
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
        <span style={{ fontWeight:700, fontSize:'0.95rem', color:'#f0f0f0', textTransform:'uppercase' }}>{exercise.name}</span>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {exercise.restTime && (
            <span style={{ fontSize:'0.82rem', color:'#bbb', border:'1px solid #444', padding:'3px 7px', borderRadius:'3px', display:'inline-flex', alignItems:'center', gap:'3px' }}>
              ⏱ {exercise.restTime}s
              {lastExData?.actRestTime && lastExData.actRestTime !== '' && (
                <span style={{color:'#60a5fa', fontSize:'0.82rem', marginLeft:'2px'}}>({lastExData.actRestTime}s)</span>
              )}
              <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="--" value={actRestTime} onChange={e => setRT(e.target.value)}
                style={{ width:'3ch', background:'none', border:'none', color: actRestTime ? (parseInt(actRestTime) < parseInt(exercise.restTime) ? '#ff4747' : '#4ade80') : '#bbb', fontSize:'0.82rem', fontFamily:'inherit', padding:'0', margin:'0', textAlign:'center', outline:'none' }}
              />
              {actRestTime !== '' && actRestTime !== undefined && <span style={{color: parseInt(actRestTime) < parseInt(exercise.restTime) ? '#ff4747' : '#4ade80', fontSize:'0.82rem'}}>s</span>}
            </span>
          )}
          <span style={{background:'#e8ff47',color:'#0a0a0a',padding:'2px 6px',borderRadius:'4px',fontWeight:900,fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>{exercise.sets} {t('setsLabel')}</span>
        </div>
      </div>

      {(isChanged() || showSavedMsg) && (
        <div style={{display:'flex', justifyContent:'center', marginBottom:'12px'}}>
          <button onClick={showSavedMsg ? undefined : handleSaveDefaults}
            style={{
              background: showSavedMsg ? '#22c55e' : 'transparent', color: showSavedMsg ? '#0a0a0a' : '#e8ff47',
              border: `1px solid ${showSavedMsg ? '#22c55e' : '#e8ff47'}`, borderRadius: '20px', padding: '6px 14px',
              fontSize: '0.78rem', fontWeight: 'bold', cursor: showSavedMsg ? 'default' : 'pointer', transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '6px', boxShadow: showSavedMsg ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none'
            }}>
            {showSavedMsg ? <><IconCheck size={14} /> Scheda Aggiornata</> : <><IconSave size={14} /> Imposta come default</>}
          </button>
        </div>
      )}

      <div style={{display:'flex', justifyContent:'center', gap:'16px', marginTop:'4px', marginBottom:'16px'}}>
        {current1RM > 0 && <span style={{fontSize:'0.82rem', color:'#ccc', background:'#1a1a1a', padding:'2px 8px', borderRadius:'4px'}}>1RM: <strong style={{color:'#e8ff47'}}>{Math.round(current1RM)} kg</strong></span>}
        {currentVolume > 0 && <span style={{fontSize:'0.82rem', color:'#ccc', background:'#1a1a1a', padding:'2px 8px', borderRadius:'4px'}}>Vol: <strong style={{color:'#e8ff47'}}>{currentVolume} kg</strong></span>}
      </div>

      <div style={{textAlign:'center', fontSize:'0.72rem', color:'#555', marginBottom:'8px', letterSpacing:'0.03em'}}>{t('instructionsSession')}</div>

      {/* RIGA 1: BOTTONI SERIE COMPLETA + RIR SINGOLO */}
      <div style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
        
        {/* ZONA RIR A SINISTRA (Centrata e con Badge Neutro) */}
        <div style={{width:'38px', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px'}}>
          {exercise.targetRir && exercise.targetRir !== '' ? (
            <>
              <span style={{fontSize:'0.85rem', fontWeight:700, color:'#aaa', lineHeight:'1'}}>rir</span>
              <span style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                minWidth:'24px', padding:'2px 4px',
                background:'#1a1a1a', border:'1px solid #444', borderRadius:'4px',
                fontSize:'0.8rem', color:'#ccc', fontWeight:800, lineHeight:'1'
              }}>
                {exercise.targetRir}
              </span>
            </>
          ) : (
            <span style={{width:'38px'}} />
          )}
        </div>

        {exercise.baseWeights.map((_, i) => {
          const isWarmup = i < warmupCount;
          return (
            <SetHeaderCell 
              key={i} index={i} isCompleted={completed[i]} 
              isWarmup={isWarmup} warmupCount={warmupCount} 
              onToggle={toggleComplete} 
            />
          );
        })}
      </div>

      {/* RIGA 2: INPUT PESI (KG) */}
      <div style={{display:'flex',gap:'8px',alignItems:'flex-end',marginBottom:'10px'}}>
        <span style={{fontSize:'0.85rem',fontWeight:700,color:'#aaa',width:'38px',flexShrink:0,textAlign:'left', paddingBottom:'8px'}}>kg</span>
        {exercise.baseWeights.map((bw, i) => {
          let prevWDisp = lastExData?.actWeights?.[i];
          if (!prevWDisp && prevWDisp !== '') prevWDisp = lastExData?.weights?.[i];
          return (
            <WeightInputCell 
              key={i} index={i} actualKg={actWeights[i]} targetKg={bw} 
              prevWDisp={prevWDisp} prevR={lastExData?.actReps?.[i]} 
              isCompleted={completed[i]} isWarmup={i < warmupCount} onChange={setAW} 
            />
          );
        })}
      </div>

      {/* RIGA 3: INPUT RIPETIZIONI (RIP) */}
      <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'4px'}}>
        <span style={{fontSize:'0.85rem',fontWeight:700,color:'#aaa',width:'38px',flexShrink:0,textAlign:'left'}}>rip</span>
        {exercise.baseWeights.map((_, i) => (
          <RepInputCell 
            key={i} index={i} actualReps={actReps[i]} targetReps={exercise.baseReps?.[i]} 
            isCompleted={completed[i]} isWarmup={i < warmupCount} onChange={setR} 
          />
        ))}
      </div>

      {/* NOTE */}
      <input type="text" placeholder={t('notesPlaceholder')} value={notes} onChange={e=>onChange({...data,notes:e.target.value})}
        style={{width:'100%',background:'#0d0d0d',border:'1px solid #1e1e1e', borderRadius:'4px',color:'#f0f0f0',padding:'6px 8px',fontSize:'0.78rem',outline:'none',marginTop:'6px'}}
      />
    </div>
  );
}

function SessionView({workout, workouts, setWorkouts, sessions, timerMasterEnabled, setTimerMasterEnabled, onSave, onBack, startTimer}) {
  const autosaveKey = 'gl_autosave_' + workout.id;

  const lastSession = useMemo(() => {
    if (!sessions) return null;
    const ws = sessions.filter(s => s.workoutId === workout.id);
    if (ws.length === 0) return null;
    return ws.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
  }, [sessions, workout.id]);

  const init = () => {
    const savedData = lsGet(autosaveKey);
    if (savedData) return savedData;

    const d={};
    workout.circuits.forEach(c=>c.exercises.forEach(e=>{
      d[e.id]={
        weights: [...e.baseWeights],
        actWeights: e.baseWeights.map(()=>''),
        actReps: e.baseWeights.map(()=>''), 
        completed: e.baseWeights.map(()=>false),
        notes: '',
        restTime: e.restTime || '' 
      };
    }));
    return d;
  };
  
  const [data,setData]=useState(init);
  const [saved,setSaved]=useState(false);

  // --- LOGICA SMART SYNC: Salvataggio permanente in scheda ---
  const handleUpdateDefaults = (exId, newWeights, newReps, newRest) => {
    if (!setWorkouts) return; 
    
    const updatedWorkouts = workouts.map(w => {
      if (w.id === workout.id) {
        const newCircuits = w.circuits.map(c => ({
          ...c,
          exercises: c.exercises.map(e => 
            e.id === exId 
              ? { ...e, baseWeights: newWeights, baseReps: newReps, restTime: newRest }
              : e
          )
        }));
        return { ...w, circuits: newCircuits };
      }
      return w;
    });
    setWorkouts(updatedWorkouts);
  };
  // ---------------------------------------------------------

// --- DEBOUNCE AUTOSAVE ---
  useEffect(() => {
    const handler = setTimeout(() => {
      lsSet(autosaveKey, data);
    }, 500); // Attende 500ms dall'ultima modifica prima di scrivere su disco

    return () => {
      clearTimeout(handler); // Pulisce il timer se l'utente digita di nuovo velocemente
    };
  }, [data, autosaveKey]);
  // -------------------------

  const handleSave = () => {
    if (saved) return;
    setSaved(true);
    onSave({
      id: uid(),
      workoutId: workout.id,
      workoutName: workout.name,
      date: new Date().toISOString(),
      data: data
    });
    localStorage.removeItem(autosaveKey);
    setTimeout(() => { onBack(); }, 800);
  };

  const handleReset = () => {
    if (confirm(t('confirmResetSession'))) {
      localStorage.removeItem(autosaveKey);
      const d={};
      workout.circuits.forEach(c=>c.exercises.forEach(e=>{
        d[e.id]={
          weights: [...e.baseWeights],
          actWeights: e.baseWeights.map(()=>''),
          actReps: e.baseWeights.map(()=>''),
          completed: e.baseWeights.map(()=>false),
          notes: '',
          restTime: e.restTime || ''
        };
      }));
      setData(d);
    }
  };

  const totalSessionVolume = useMemo(() => {
    return calculateSessionVolume({data, workoutId: workout.id}, workouts);
  }, [data, workout.id, workouts]);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{flex:1}}>
          <div style={{fontSize:'0.75rem',color:'#ffffff',letterSpacing:'0.1em',textTransform:'uppercase', fontWeight:'bold'}}>{t('sessionInProgress')}</div>
          <div style={{fontWeight:800,fontSize:'1.15rem',color:'#f0f0f0'}}>{workout.name}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'0.85rem',color:'#ffffff', display:'flex', alignItems:'center', gap:'10px', justifyContent:'flex-end', fontWeight:'bold'}}>
            <span onClick={handleReset} style={{cursor:'pointer', fontSize:'1.1rem', filter:'grayscale(1) brightness(0.8)'}} title="Azzera Sessione">🔄</span>
            <span>{new Date().toLocaleDateString(userLang === 'it' ? 'it-IT' : 'en-US')}</span>
          </div>
          {totalSessionVolume > 0 && <div style={{fontSize:'0.85rem',color:'#ccc',fontWeight:700,marginTop:'4px'}}>Vol: {totalSessionVolume} kg</div>}
        </div>
      </div>

      <div style={{
        background: timerMasterEnabled ? '#141c10' : '#1a1212',
        border: timerMasterEnabled ? '1px solid #2e4a1c' : '1px solid #4a1c1c',
        borderRadius: '6px', padding: '10px 14px', marginBottom: '18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer'
      }} onClick={() => setTimerMasterEnabled(!timerMasterEnabled)}>
        <span style={{fontSize: '0.75rem', fontWeight: 800, color: timerMasterEnabled ? '#a3e635' : '#f87171'}}>
          {timerMasterEnabled ? t('timerStatusOn') : t('timerStatusOff')}
        </span>
        <span style={{
          fontSize: '0.65rem', background: timerMasterEnabled ? '#e8ff47' : '#333',
          color: '#0a0a0a', padding: '3px 8px', borderRadius: '4px', fontWeight: 900
        }}>
          {timerMasterEnabled ? t('timerDeactivate') : t('timerActivate')}
        </span>
      </div>

      {workout.circuits.map(circuit=>(
        <div key={circuit.id} style={{marginBottom:'24px'}}>
          <div style={S.sectionTitle}>{circuit.name}</div>
          {circuit.exercises.map(ex=>{
            const currentExData = data[ex.id] || {};
            
            return (
              <div key={ex.id} style={{
                background:'#1a1a1a', 
                border:'1px solid #333', 
                borderRadius:'12px', 
                padding:'16px', 
                marginBottom:'16px'
              }}>
                <SessionExerciseRow key={ex.id} exercise={ex}
                  data={currentExData}
                  lastExData={lastSession?.data?.[ex.id]}
                  timerMasterEnabled={timerMasterEnabled}
                  onUpdateDefaults={handleUpdateDefaults} 
                  startTimer={(duration) => {
                    const sessionDuration = currentExData.restTime !== undefined && currentExData.restTime !== '' 
                      ? currentExData.restTime 
                      : duration;
                    startTimer(parseInt(sessionDuration));
                  }}
                  onChange={val=>setData(d=>({...d,[ex.id]:val}))}
                />
              </div>
            );
          })}
        </div>
      ))}

      <button onClick={handleSave} style={{
        width:'100%',background:saved?'#22c55e':'#e8ff47',color:'#0a0a0a',
        border:'none',borderRadius:'6px',padding:'15px',fontWeight:900,
        fontSize:'0.9rem',letterSpacing:'0.1em',textTransform:'uppercase',
        cursor:'pointer',transition:'background 0.3s',marginTop:'8px',
      }}>{saved ? t('sessionSaved') : t('saveSession')}</button>
    </div>
  );
}

function HistoryView({sessions, workouts, onDeleteSession, onImportBackup, onBack}) {
  const [sel,setSel]=useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // --- Icone SVG Vettoriali ---
  const IconExport = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
  const IconImport = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
  const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
  const IconNote = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
  const IconSave = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  );

  const IconCheck = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
  const handleExport = () => {
    const dataStr = JSON.stringify({ workouts, sessions }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'gymlog_backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e) => {
    const fileReader = new FileReader();
    if (!e.target.files || e.target.files.length === 0) return;
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = event => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && (parsed.workouts || parsed.sessions)) {
          if (confirm(userLang === 'it' ? "Sei sicuro di voler importare questo backup? I dati attuali verranno sovrascritti." : "Are you sure you want to import this backup? Current data will be overwritten.")) {
            onImportBackup(parsed.workouts || workouts, parsed.sessions || sessions);
            alert(userLang === 'it' ? "Dati importati con successo!" : "Backup imported successfully!");
          }
        } else { alert(userLang === 'it' ? "Formato file di backup non valido." : "Invalid backup file format."); }
      } catch (err) { alert(userLang === 'it' ? "Errore nella lettura del file di backup." : "Error reading backup file."); }
    };
  };

  if (sel) {
    const workout=workouts.find(w=>w.id===sel.workoutId);
    const sessionTotalVolume = calculateSessionVolume(sel, workouts);

    return (
      <div>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
          <BackBtn onClick={()=>setSel(null)}/>
          <div style={{flex:1}}>
            <div style={{fontSize:'0.6rem',color:'#555',letterSpacing:'0.1em',textTransform:'uppercase'}}>{t('historiqueLabel')}</div>
            <div style={{fontWeight:800,color:'#f0f0f0'}}>{sel.workoutName}</div>
            <div style={{fontSize:'0.72rem',color:'#555'}}>
              {new Date(sel.date).toLocaleDateString(userLang === 'it' ? 'it-IT' : 'en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
          {sessionTotalVolume > 0 && (
            <div style={{textAlign:'right', background:'#1a1a1a', padding:'6px 10px', borderRadius:'4px', border:'1px solid #222'}}>
              <div style={{fontSize:'0.55rem', color:'#888', textTransform:'uppercase'}}>{t('totalLoad')}</div>
              <div style={{fontSize:'0.95rem', color:'#ccc', fontWeight:900}}>{sessionTotalVolume} kg</div>
            </div>
          )}
        </div>
        {workout?.circuits.map(circuit=>(
          <div key={circuit.id} style={{marginBottom:'18px'}}>
            <div style={S.sectionTitle}>{circuit.name}</div>
            {circuit.exercises.map(ex=>{
          const d=sel.data[ex.id]||{};
          const weights=d.weights||ex.baseWeights;
          const actWeights = d.actWeights;
          const actReps=d.actReps||[];
          const exVolume = calculateExerciseVolume(d, ex.baseReps || [], ex.baseWeights || []);
          const ex1RM = ex.baseWeights.reduce((max, bw, i) => {
            let wStr = weights[i];
            if (actWeights && actWeights[i] !== '' && actWeights[i] !== undefined) {
              wStr = actWeights[i];
            }
            const weight = parseFloat(wStr) || 0;
            const repsStr = actReps[i];
            const reps = (repsStr !== undefined && repsStr !== '') ? (parseInt(repsStr) || 0) : (parseInt(ex.baseReps?.[i]) || 0);
            if (weight <= 0 || reps <= 0) return max;
            const epley = reps === 1 ? weight : weight * (1 + reps / 30);
            return epley > max ? epley : max;
          }, 0);

          return (
            <div key={ex.id} style={{background:'#111',borderRadius:'6px', padding:'10px 12px',marginBottom:'6px',borderLeft:'3px solid #2a2a2a'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontWeight:700,fontSize:'0.9rem',color:'#ddd'}}>{ex.name}</span>
                <span style={{fontSize:'0.75rem',color:'#666', fontWeight:700}}>{ex.sets} {t('setsLabel')}</span>
              </div>
              <div style={{display:'flex', justifyContent:'center', gap:'12px', marginTop:'2px', marginBottom:'10px'}}>
                {ex1RM > 0 && <span style={{fontSize:'0.78rem', color:'#aaa'}}>1RM: <strong style={{color:'#e8ff47'}}>{Math.round(ex1RM)} kg</strong></span>}
                {exVolume > 0 && <span style={{fontSize:'0.78rem', color:'#aaa'}}>Tot: <strong style={{color:'#e8ff47'}}>{exVolume} kg</strong></span>}
              </div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {ex.baseWeights.map((bw, i)=>{
                  const r=actReps[i];
                  const isRepDiff = r !== '' && r !== undefined && ex.baseReps?.[i] && parseInt(r) !== parseInt(ex.baseReps[i]);
                  
                  let wStr = weights[i];
                  if (actWeights && actWeights[i] !== '' && actWeights[i] !== undefined) {
                    wStr = actWeights[i];
                  }
                  const isKgDiff = actWeights && actWeights[i] !== '' && parseFloat(actWeights[i]) !== parseFloat(bw);
                  const isOldKgDiff = !isKgDiff && wStr !== undefined && bw !== undefined && parseFloat(wStr) !== parseFloat(bw);
                  
                  // Integrazione vecchie reps storiche in blu
                  const oldRepsStr = d.reps?.[i];
                  const isOldRepDiff = !isRepDiff && oldRepsStr !== undefined && ex.baseReps?.[i] && parseInt(oldRepsStr) !== parseInt(ex.baseReps[i]);

                  const currentRepColor = isRepDiff ? (parseInt(r) < parseInt(ex.baseReps[i]) ? '#ff4747' : '#4ade80') : '#aaa';
                  const currentKgColor = isKgDiff ? (parseFloat(actWeights[i]) < parseFloat(bw) ? '#ff4747' : '#4ade80') : '#aaa';

                  return (
                    <div key={i} style={{background:'#1a1a1a', border:'1px solid #222', borderRadius:'4px',padding:'5px 4px',textAlign:'center',minWidth:'55px', flex:1}}>
                      <div style={{fontSize:'0.78rem',color:'#f0f0f0'}}>
                        <span>{bw||'—'}</span>
                        {isKgDiff && <span style={{color: currentKgColor, fontWeight:'normal', marginLeft:'2px'}}>({actWeights[i]})</span>}
                        {isOldKgDiff && <span style={{color: '#60a5fa', fontWeight:'normal', marginLeft:'2px'}}>({wStr})</span>} 
                        <span style={{color:'#aaa', fontSize:'0.7rem', marginLeft:'2px'}}>kg</span>
                      </div>
                      <div style={{fontSize:'0.72rem',color:'#f0f0f0',marginTop:'2px'}}>
                        <span>{ex.baseReps?.[i] || '—'}</span>
                        {isRepDiff && <span style={{color: currentRepColor, fontWeight:'normal', marginLeft:'2px'}}>({r})</span>}
                        {isOldRepDiff && <span style={{color: '#60a5fa', fontWeight:'normal', marginLeft:'2px'}}>({oldRepsStr})</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {d.notes&&<div style={{fontSize:'0.72rem',color:'#555',marginTop:'6px', display:'flex', alignItems:'center', gap:'4px'}}><IconNote/> {d.notes}</div>}
            </div>
          );
        })}
          </div>
        ))}
      </div>
    );
  }

  const sorted=[...sessions].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{fontWeight:800,fontSize:'1.05rem',color:'#f0f0f0',flex:1}}>{t('historyTitle')}</div>
      </div>

      <div style={{
        background:'#141414', border:'1px dashed #222', borderRadius:'6px',
        padding:'10px', marginBottom:'16px', display:'flex', gap:'8px', justifyContent:'space-between'
      }}>
        <button onClick={handleExport} style={{
          flex:1, background:'#1a1a1a', border:'1px solid #333', color:'#e8ff47', 
          padding:'12px 4px', borderRadius:'4px', fontSize:'0.85rem', fontWeight:700, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
        }}><IconExport/> {t('btnExportBackup')}</button>
        
        <label style={{
          flex:1, background:'#1a1a1a', border:'1px solid #333', color:'#aaa',
          padding:'12px 4px', borderRadius:'4px', fontSize:'0.85rem', fontWeight:700,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
        }}>
          <IconImport/> {t('btnImportBackup')}
          <input type="file" accept=".json" onChange={handleImport} style={{display:'none'}} />
        </label>
      </div>

      {sorted.length===0&&<div style={{textAlign:'center',color:'#333',padding:'40px 0'}}>{t('noSessions')}</div>}
      
      {sorted.map(s=>{
        const vol = calculateSessionVolume(s, workouts);
        const isConfirming = deletingId === s.id;
        return (
          <div key={s.id} style={{marginBottom:'8px'}}>
            <div style={{
              background:'#111',border:'1px solid #1e1e1e',borderRadius:'8px',
              padding:'14px 16px', display:'flex',justifyContent:'space-between',alignItems:'center',
            }}>
              <div onClick={()=>setSel(s)} style={{flex:1, cursor:'pointer'}}>
                <div style={{fontWeight:700,color:'#f0f0f0',fontSize:'0.9rem'}}>{s.workoutName}</div>
                <div style={{fontSize:'0.7rem',color:'#444',marginTop:'3px'}}>
                  {new Date(s.date).toLocaleDateString(userLang === 'it' ? 'it-IT' : 'en-US',{weekday:'short',day:'numeric',month:'short'})}
                  {' '}{new Date(s.date).toLocaleTimeString(userLang === 'it' ? 'it-IT' : 'en-US',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'14px'}}>
                {vol > 0 && <span onClick={()=>setSel(s)} style={{fontSize:'0.85rem', color:'#ccc', fontWeight:700, cursor:'pointer'}}>{vol} kg</span>}
                <span onClick={()=>setSel(s)} style={{color:'#444',fontSize:'1.2rem', cursor:'pointer'}}>›</span>
                {!isConfirming && (
                  <button onClick={() => setDeletingId(s.id)} style={{
                    background:'none', border:'none', color:'#ff4747', cursor:'pointer', padding:'4px 0 4px 8px',
                    display:'flex', alignItems:'center', justifyContent:'center'
                  }}><IconTrash/></button>
                )}
              </div>
            </div>
            {isConfirming && (
              <div style={{
                background:'#1a0d0d', border:'1px solid #5c1d1d', borderRadius:'0 0 8px 8px',
                padding:'10px 14px', marginTop:'-4px', display:'flex', flexDirection:'column', gap:'8px'
              }}>
                <div style={{fontSize:'0.78rem', color:'#ff8080', fontWeight:700, textAlign:'center'}}>
                  {t('confirmDeleteHistory')}
                </div>
                <div style={{display:'flex', gap:'8px'}}>
                  <button onClick={() => { onDeleteSession(s.id); setDeletingId(null); }} style={{
                    flex:1, background:'#ff4747', color:'#fff', border:'none', borderRadius:'4px',
                    padding:'6px', fontSize:'0.75rem', fontWeight:800, cursor:'pointer'
                  }}>{userLang === 'it' ? 'SÌ' : 'YES'}</button>
                  <button onClick={() => setDeletingId(null)} style={{
                    flex:1, background:'#222', color:'#aaa', border:'1px solid #333', borderRadius:'4px',
                    padding:'6px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer'
                  }}>{userLang === 'it' ? 'ANNULLA' : 'CANCEL'}</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function AnalyticsView({sessions, workouts, onBack}) {
  const [activeWorkoutId, setActiveWorkoutId] = useState(workouts[0]?.id || null);

  const exerciseCharts = useMemo(() => {
    if (!activeWorkoutId) return [];
    const selectedWorkout = workouts.find(w => w.id === activeWorkoutId);
    if (!selectedWorkout) return [];
    const workoutSessions = sessions
      .filter(s => s.workoutId === activeWorkoutId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const charts = [];
    selectedWorkout.circuits.forEach(circuit => {
      circuit.exercises.forEach(ex => {
        const points = [];
        workoutSessions.forEach(session => {
          const exData = session.data ? session.data[ex.id] : null;
          const volume = calculateExerciseVolume(exData, ex.baseReps || []);
          if (volume > 0) {
            points.push({
              date: new Date(session.date).toLocaleDateString('it-IT', {day:'numeric', month:'short'}),
              volume: volume
            });
          }
        });
        charts.push({ id: ex.id, name: ex.name, circuitName: circuit.name, points });
      });
    });
    return charts;
  }, [sessions, workouts, activeWorkoutId]);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{fontWeight:800,fontSize:'1.05rem',color:'#f0f0f0'}}>Andamento Esercizi</div>
      </div>

      <div style={{display:'flex',gap:'8px',overflowX:'auto',marginBottom:'18px',paddingBottom:'4px'}}>
        {workouts.map(w => (
          <button key={w.id} onClick={() => setActiveWorkoutId(w.id)} style={{
            background: w.id === activeWorkoutId ? '#e8ff47' : '#1a1a1a',
            color: w.id === activeWorkoutId ? '#0a0a0a' : '#888',
            border: 'none', borderRadius: '4px', padding: '10px 14px',
            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>{w.name}</button>
        ))}
      </div>

      {exerciseCharts.length === 0 && (
        <div style={{textAlign:'center',color:'#333',padding:'40px 0', fontSize:'0.85rem'}}>
          Nessun esercizio configurato per questo allenamento.
        </div>
      )}

      {exerciseCharts.map(exChart => {
        const pts = exChart.points;
        const hasData = pts.length >= 2;
        const width = 450;
        const height = 160;
        const padding = 50;
        const volumes = pts.map(p => p.volume);
        const minVol = Math.min(...volumes) * 0.9 || 0;
        const maxVol = Math.max(...volumes) * 1.1 || 100;
        const volRange = maxVol - minVol === 0 ? 1 : maxVol - minVol;
        const svgPoints = pts.map((p, idx) => {
          const x = padding + (idx * (width - padding * 2) / (pts.length - 1 || 1));
          const y = height - padding - ((p.volume - minVol) * (height - padding * 2) / volRange);
          return { x, y, ...p };
        });
        const linePath = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return (
          <div key={exChart.id} style={{background:'#111', border:'1px solid #1e1e1e', borderRadius:'8px', padding:'14px', marginBottom:'14px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: '12px'}}>
              <div>
                <div style={{fontWeight:800, fontSize:'0.9rem', color:'#f0f0f0'}}>{exChart.name}</div>
                <div style={{fontSize:'0.6rem', color:'#555', textTransform:'uppercase', marginTop:'2px'}}>{exChart.circuitName}</div>
              </div>
              <span style={{...S.tag, background:'#1a1a1a', color:'#f0f0f0', border:'1px solid #222', fontSize:'0.65rem'}}>
                {pts.length} {pts.length === 1 ? 'log' : 'logs'}
              </span>
            </div>

            {!hasData ? (
              <div style={{height:'60px', display:'flex', alignItems:'center', justifyContent:'center', color:'#444', fontSize:'0.72rem', border:'1px dashed #222', borderRadius:'4px'}}>
                {pts.length === 1 ? `Unico carico registrato: ${pts[0].volume} kg. Allena ancora per vedere il grafico.` : 'Nessun dato registrato.'}
              </div>
            ) : (
              <div style={{width:'100%', overflowX:'auto'}}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{width:'100%', height:'auto', display:'block'}}>
                  <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#1f1f1f" strokeDasharray="3,3" />
                  <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#1f1f1f" />
                  <text x={padding - 10} y={padding + 4} fill="#f0f0f0" fontSize="12" fontWeight="700" textAnchor="end">{Math.round(maxVol)}kg</text>
                  <text x={padding - 10} y={height - padding + 4} fill="#f0f0f0" fontSize="12" fontWeight="700" textAnchor="end">{Math.round(minVol)}kg</text>
                  <path d={linePath} fill="none" stroke="#e8ff47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {svgPoints.map((g_pt, i) => (
                    <g key={i}>
                      <circle cx={g_pt.x} cy={g_pt.y} r="4.5" fill="#0a0a0a" stroke="#e8ff47" strokeWidth="2.5" />
                      <text x={g_pt.x} y={g_pt.y - 10} fill="#e8ff47" fontSize="13" fontWeight="800" textAnchor="middle">{g_pt.volume}</text>
                      <text x={g_pt.x} y={height - padding + 16} fill="#f0f0f0" fontSize="11" textAnchor="middle">{g_pt.date}</text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExerciseEditor({exercise, onChange, onDelete}) {
  const updateBaseW = (i, v) => {
    const bw = [...(exercise.baseWeights || [])];
    bw[i] = v;
    onChange({ ...exercise, baseWeights: bw });
  };
  
  const updateBaseR = (i, v) => {
    const br = [...(exercise.baseReps || exercise.baseWeights.map(() => ''))];
    br[i] = v;
    onChange({ ...exercise, baseReps: br });
  };

  const setSets = n => {
    if (n === '') { onChange({ ...exercise, sets: '' }); return; }
    const c = parseInt(n);
    if (isNaN(c) || c < 1) return;
    
    const bw = [...(exercise.baseWeights || [])];
    const br = [...(exercise.baseReps || bw.map(() => ''))];
    while(bw.length < c) bw.push('');
    while(br.length < c) br.push('');
    
    const currentWarmups = exercise.warmupSets || 0;
    const newWarmups = currentWarmups > c ? c : currentWarmups;

    onChange({ 
      ...exercise, 
      sets: c, 
      warmupSets: newWarmups,
      baseWeights: bw.slice(0, c), 
      baseReps: br.slice(0, c)
    });
  };

  const setWarmupSets = n => {
    let c = n === '' ? 0 : parseInt(n);
    if (isNaN(c) || c < 0) c = 0;
    if (c > (parseInt(exercise.sets) || 0)) c = (parseInt(exercise.sets) || 0);
    onChange({ ...exercise, warmupSets: c });
  };

  const baseReps = exercise.baseReps || exercise.baseWeights.map(() => '');
  const warmups = exercise.warmupSets || 0;

  return (
    <div style={{background:'#131313',borderRadius:'6px',padding:'10px 12px',marginBottom:'8px',border:'1px solid #1e1e1e'}}>
      <div style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
        <input value={exercise.name} placeholder={t('exercisePlaceholder')} onChange={e=>onChange({...exercise,name:e.target.value})} style={{...S.input,flex:1}}/>
        <button onClick={() => { if (confirm(t('confirmDeleteEx'))) onDelete(); }} style={{background:'none',border:'none',cursor:'pointer',color:'#ff4747',fontSize:'1.2rem',flexShrink:0,padding:'4px 6px'}}>✕</button>
      </div>
      
      <div style={{display:'flex',gap:'10px',marginBottom:'8px',alignItems:'center'}}>
        <label style={{display:'flex',flexDirection:'column',gap:'3px',fontSize:'0.75rem',color:'#aaa'}}>
          Serie
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={exercise.sets} onChange={e=>setSets(e.target.value)} style={{...S.input,width:'44px'}}/>
        </label>
        
        <label style={{display:'flex',flexDirection:'column',gap:'3px',fontSize:'0.75rem',color:'#fb923c'}}>
          Risc.
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={warmups} onChange={e=>setWarmupSets(e.target.value)} style={{...S.input,width:'44px', color:'#fb923c', borderColor:'#fb923c'}}/>
        </label>

        {/* SINGOLO INPUT PER IL RIR - COLORE NEUTRO */}
        <label style={{display:'flex',flexDirection:'column',gap:'3px',fontSize:'0.75rem',color:'#ccc'}}>
          RIR
          <input type="text" inputMode="decimal" placeholder="—" value={exercise.targetRir || ''} onChange={e=>onChange({...exercise,targetRir:e.target.value})} style={{...S.input,width:'44px', color:'#ccc', borderColor:'#444'}}/>
        </label>

        <label style={{display:'flex',flexDirection:'column',gap:'3px',fontSize:'0.75rem',color:'#aaa',flex:1}}>
          Rec. (s)
          <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder={t('restPlaceholder')} value={exercise.restTime || ''} onChange={e=>onChange({...exercise,restTime:e.target.value})} style={{...S.input}}/>
        </label>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'6px',marginTop:'4px'}}>
        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
          <span style={{fontSize:'0.65rem',color:'#aaa',width:'28px'}}>kg:</span>
          {exercise.baseWeights.map((bw,i)=>(
            <input key={i} type="text" value={bw} placeholder="—" onChange={e=>updateBaseW(i,e.target.value)} 
              style={{
                ...S.input, padding:'4px 2px', fontSize:'0.9rem', textAlign:'center', minWidth:0, flex:1,
                borderBottom: i < warmups ? '1px solid #fb923c' : '1px solid #333'
              }}
            />
          ))}
        </div>
        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
          <span style={{fontSize:'0.65rem',color:'#aaa',width:'28px'}}>rip:</span>
          {baseReps.map((br,i)=>(
            <input key={i} type="text" value={br} placeholder="—" onChange={e=>updateBaseR(i,e.target.value)} 
              style={{
                ...S.input, padding:'4px 2px', fontSize:'0.9rem', textAlign:'center', minWidth:0, flex:1,
                borderBottom: i < warmups ? '1px solid #fb923c' : '1px solid #333'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
function SetupView({workouts, setWorkouts, onBack}) {
  const [eid,setEid]=useState(workouts[0]?.id||null);
  const [savedMsg, setSavedMsg] = useState(false);
  const workout=workouts.find(w=>w.id===eid);

  const triggerSave = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const upd = (updated) => {
    setWorkouts(ws=>ws.map(w=>w.id===updated.id?updated:w));
    triggerSave();
  };

  // --- Funzioni Import/Export ---
  const handleExportWorkout = () => {
    if (!workout) return;
    const dataStr = JSON.stringify({ type: 'single_workout', workout: workout }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = `workout_${workout.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    linkElement.click();
    URL.revokeObjectURL(url);
  };

  const handleImportWorkout = (e) => {
    const fileReader = new FileReader();
    if (!e.target.files || e.target.files.length === 0) return;
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.type === 'single_workout' && data.workout) {
          const imported = data.workout;
          imported.id = uid();
          imported.circuits.forEach(c => {
            c.id = uid();
            c.exercises.forEach(ex => { ex.id = uid(); });
          });
          setWorkouts(ws => [...ws, imported]);
          setEid(imported.id);
          alert(t('alertImported'));
        }
      } catch (err) { alert(t('alertErrorRead')); }
      e.target.value = '';
    };
  };

  // --- Icone SVG ---
  const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
  const IconExport = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
  const IconTrash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
  const IconClose = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{fontWeight:800,fontSize:'1.1rem',color:'#f0f0f0'}}>{t('configTitle')}</div>
        {savedMsg && <span style={{marginLeft:'auto', fontSize:'0.7rem', color:'#e8ff47'}}>{t('savedAlert')}</span>}
      </div>
      
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
        {workouts.map(w => (
          <button key={w.id} onClick={() => setEid(w.id)} style={{
            background: w.id === eid ? '#e8ff47' : '#111',
            color: w.id === eid ? '#0a0a0a' : '#888',
            border: '1px solid #222', borderRadius: '4px', padding: '10px 14px',
            fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer'
          }}>{w.name}</button>
        ))}
        <button onClick={()=>{
          const defaultName = userLang === 'it' ? `Allenamento ${workouts.length+1}` : `Workout ${workouts.length+1}`;
          const w={id:uid(),name:defaultName,circuits:[]};
          setWorkouts(ws=>[...ws,w]); setEid(w.id);
        }} style={{background:'#111',border:'1px solid #222',borderRadius:'4px',color:'#ccc',padding:'10px 14px',cursor:'pointer',fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'6px'}}><IconPlus/> {t('btnNew')}</button>
      </div>

      {workout&&(
        <div>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',alignItems:'center', background:'#111', padding:'10px', borderRadius:'8px'}}>
            <input value={workout.name} onChange={e=>upd({...workout,name:e.target.value})} style={{...S.input,flex:1,fontSize:'1.1rem',fontWeight:800, border:'none'}}/>
            <button onClick={handleExportWorkout} style={{background:'none',border:'none',cursor:'pointer',color:'#60a5fa',padding:'4px'}}><IconExport/></button>
            <button onClick={()=>{ if (confirm(t('confirmDeleteWorkout'))) { setWorkouts(ws=>ws.filter(w=>w.id!==workout.id)); setEid(workouts.find(w=>w.id!==workout.id)?.id||null); }}} style={{background:'none',border:'none',cursor:'pointer',color:'#ff4747',padding:'4px'}}><IconTrash/></button>
          </div>
          
          {workout.circuits.map(circuit=>(
            <div key={circuit.id} style={{marginBottom:'16px', background:'#111', padding:'12px', borderRadius:'8px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                <input value={circuit.name} onChange={e=>upd({...workout,circuits:workout.circuits.map(c=>c.id===circuit.id?{...c,name:e.target.value}:c)})} style={{...S.input,fontWeight:800,flex:1,color:'#e8ff47', border:'none'}}/>
                <button onClick={()=>{ if (confirm(t('confirmDeleteCircuit'))) upd({...workout,circuits:workout.circuits.filter(c=>c.id!==circuit.id)}); }} style={{background:'none',border:'none',cursor:'pointer',color:'#555',padding:'4px'}}><IconClose/></button>
              </div>
              
              {circuit.exercises.map(ex=>(
                <ExerciseEditor key={ex.id} exercise={ex}
                  onChange={updated=>{
                    const newCircuits = workout.circuits.map(c=>c.id===circuit.id?{...c,exercises:c.exercises.map(e=>e.id===ex.id?updated:e)}:c);
                    setWorkouts(ws=>ws.map(w=>w.id===workout.id?{...workout,circuits:newCircuits}:w));
                    triggerSave();
                  }}
                  onDelete={()=>{
                    const newCircuits = workout.circuits.map(c=>c.id===circuit.id?{...c,exercises:c.exercises.filter(e=>e.id!==ex.id)}:c);
                    upd({...workout,circuits:newCircuits});
                  }}
                />
              ))}
              <button onClick={()=>{
                const ex={id:uid(),name:'',sets:4,baseWeights:['','','',''],baseReps:['','','',''],restTime:'', warmupSets: 0};
                upd({...workout,circuits:workout.circuits.map(c=>c.id===circuit.id?{...c,exercises:[...c.exercises,ex]}:c)});
              }} style={{background:'transparent',border:'1px solid #222',borderRadius:'4px',color:'#888',width:'100%',padding:'10px',cursor:'pointer',fontSize:'0.8rem', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}><IconPlus/> {t('addExercise')}</button>
            </div>
          ))}
          
          <button onClick={()=>{
            const defaultCircuitName = userLang === 'it' ? `Circuito ${workout.circuits.length+1}` : `Circuit ${workout.circuits.length+1}`;
            const c={id:uid(),name:defaultCircuitName,exercises:[]};
            upd({...workout,circuits:[...workout.circuits,c]});
          }} style={{background:'#e8ff47',border:'none',borderRadius:'6px',color:'#000',width:'100%',padding:'14px',cursor:'pointer',fontSize:'0.9rem', fontWeight:900}}>{t('addCircuit')}</button>
        </div>
      )}
    </div>
  );
}

function InstructionsView({onBack}) {
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{fontWeight:800,fontSize:'1.05rem',color:'#f0f0f0'}}>{userLang === 'it' ? "Guida all'uso" : "User Guide"}</div>
      </div>

      <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:'8px',padding:'18px', fontSize:'0.9rem', lineHeight:'1.5', color:'#ccc'}}>
        
        {userLang === 'it' ? (
          <>
            <p style={{marginBottom:'16px'}}>
              Questa app è progettata per monitorare in modo rapido ed essenziale le tue routine di allenamento in palestra.
            </p>

            <h3 style={{color:'#e8ff47', fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'0.1em', chartsNameBelow: '8px', marginBottom:'8px'}}>1. Configurazione</h3>
            <ul style={{paddingLeft:'20px', marginBottom:'20px'}}>
              <li style={{marginBottom:'6px'}}><strong>Allenamento:</strong> La tua singola sessione giornaliera (es. "Gambe").</li>
              <li style={{marginBottom:'6px'}}><strong>Circuito:</strong> Un gruppo di esercizi da eseguire in successione.</li>
              <li style={{marginBottom:'6px'}}>Usa la schermata "Configura" per preparare la tua scheda. Inserisci nome esercizio, numero di serie, tempi di recupero, pesi programmati e ripetizioni.</li>
              <li style={{marginBottom:'6px'}}>Usa i pulsanti in basso per aggiungere elementi e la <strong>"X"</strong> per rimuoverli.</li>
              <li>Con i pulsanti <strong>Esporta</strong> e <strong>Importa</strong> puoi condividere un programma di allenamento con altri utenti o salvarne una copia.</li>
            </ul>

            <h3 style={{color:'#e8ff47', fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px'}}>2. In Palestra</h3>
            <ul style={{paddingLeft:'20px', marginBottom:'20px'}}>
              <li style={{marginBottom:'6px'}}>Esegui l'esercizio come configurato nella scheda. Al termine di ogni serie premi il tasto <strong>SERIE</strong> corrispondente per segnalarne il completamento.</li>
              <li style={{marginBottom:'6px'}}>Se hai utilizzato un carico diverso dal programmato, scrivilo nel campo <strong>kg</strong> indicato da <strong>--</strong>. Se hai effettuato un numero di ripetizioni diverso dal programmato, scrivilo nel campo <strong>rip</strong>.</li>
              <li style={{marginBottom:'6px'}}>La pressione del tasto serie, l'inserimento di un carico personalizzato o di ripetizioni custom avvia automaticamente il <strong>timer di recupero</strong> impostato in configurazione for quell'esercizio.</li>
              <li style={{marginBottom:'6px'}}>Il timer può essere disabilitato in qualsiasi momento con il tasto <strong>Disattiva tempi di recupero</strong> in cima alla schermata.</li>
              <li style={{marginBottom:'6px'}}><strong>1RM:</strong> Stima del massimo carico sollevabile per una singola ripetizione, calcolata con la formula di Epley (peso × ripetizioni effettuate).</li>
              <li style={{marginBottom:'6px'}}><strong>Vol:</strong> Carico totale dell'esercizio in kg (peso × ripetizioni per ogni serie).</li>
              <li style={{marginBottom:'6px'}}><strong>Note:</strong> Campo liberamente editabile per appunti veloci — dolori, setup dei macchinari, sensazioni.</li>
              <li style={{marginBottom:'6px'}}><strong>Memoria storica:</strong> Il valore in blu sopra il campo peso ricorda il carico e le ripetizioni effettuate nella sessione precedente.</li>
            </ul>

            <h3 style={{color:'#e8ff47', fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px'}}>3. Salvataggio e Storico</h3>
            <ul style={{paddingLeft:'20px', marginBottom:'0'}}>
              <li style={{marginBottom:'6px'}}><strong>Salva sessione</strong> registra l'allenamento in corso e aggiorna lo storico del carico totale per ogni esercizio.</li>
              <li style={{marginBottom:'6px'}}>Nella sessione successiva, i campi kg e rip modificati rispetto al programma standard verranno riproposti automaticamente come promemoria della variazione effettuata.</li>
              <li style={{marginBottom:'6px'}}><strong>Storico:</strong> Consulta o elimina (icona cestino) tutte le sessioni completate in passato.</li>
              <li><strong>Andamento:</strong> Visualizza i grafici del tonnellaggio totale sollevato nel tempo per ogni singolo esercizio.</li>
            </ul>
          </>
        ) : (
          <>
            <p style={{marginBottom:'16px'}}>
              This app is designed to quickly and efficiently track your gym workout routines.
            </p>

            <h3 style={{color:'#e8ff47', fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px'}}>1. Setup</h3>
            <ul style={{paddingLeft:'20px', marginBottom:'20px'}}>
              <li style={{marginBottom:'6px'}}><strong>Workout:</strong> Your single daily training session (e.g., "Legs").</li>
              <li style={{marginBottom:'6px'}}><strong>Circuit:</strong> A group of exercises performed in succession.</li>
              <li style={{marginBottom:'6px'}}>Use the "Configure" screen to build your routine. Enter the exercise name, number of sets, rest periods, target weights, and repetitions.</li>
              <li style={{marginBottom:'6px'}}>Use the bottom buttons to add elements, and the <strong>"X"</strong> icon to remove them.</li>
              <li>With the <strong>Export</strong> and <strong>Import</strong> options, you can share a workout program with other users or save a backup copy.</li>
            </ul>

            <h3 style={{color:'#e8ff47', fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px'}}>2. At the Gym</h3>
            <ul style={{paddingLeft:'20px', marginBottom:'20px'}}>
              <li style={{marginBottom:'6px'}}>Perform the exercise as configured. After finishing each set, press the corresponding <strong>SETS</strong> button to mark it complete.</li>
              <li style={{marginBottom:'6px'}}>If you used a different weight than planned, type it into the <strong>kg</strong> field indicated by <strong>--</strong>. If you performed a different number of reps, type it into the <strong>reps</strong> field.</li>
              <li style={{marginBottom:'6px'}}>Tapping a set button, entering a custom weight, or editing repetitions will automatically launch the <strong>rest timer</strong> configured for that exercise.</li>
              <li style={{marginBottom:'6px'}}>The timer can be disabled at any time using the <strong>Disable rest periods</strong> button at the top of the screen.</li>
              <li style={{marginBottom:'6px'}}><strong>1RM:</strong> An estimate of the maximum weight you could lift for a single repetition, calculated via the Epley formula (weight × reps performed).</li>
              <li style={{marginBottom:'6px'}}><strong>Vol:</strong> Total training volume of the exercise in kg (weight × reps for each set).</li>
              <li style={{marginBottom:'6px'}}><strong>Notes:</strong> A free text field for quick notes — pain levels, machine setups, overall feel.</li>
              <li style={{marginBottom:'6px'}}><strong>Historical memory:</strong> The blue value above the weight field displays the weight and reps logged during your previous session.</li>
            </ul>

            <h3 style={{color:'#e8ff47', fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px'}}>3. Saving & History</h3>
            <ul style={{paddingLeft:'20px', marginBottom:'0'}}>
              <li style={{marginBottom:'6px'}}><strong>Save session</strong> logs your current workout and updates the history data for your exercises.</li>
              <li style={{marginBottom:'6px'}}>In the next session, custom weights and reps changes will automatically reappear as a friendly reminder of your last variance.</li>
              <li style={{marginBottom:'6px'}}><strong>History:</strong> Browse or delete (trash icon) all your past completed sessions.</li>
              <li><strong>Progress:</strong> View dynamic charts of total weight volume lifted over time for each exercise.</li>
            </ul>
          </>
        )}

      </div>
    </div>
  );
}

function AboutView({onBack}) {
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
        <BackBtn onClick={onBack}/>
        <div style={{fontWeight:800,fontSize:'1.05rem',color:'#f0f0f0'}}>{userLang === 'it' ? 'Informazioni' : 'About'}</div>
      </div>
      
      <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:'8px',padding:'20px', fontSize:'0.9rem', lineHeight:'1.5'}}>
        <p style={{marginBottom:'15px'}}>
          <strong style={{fontSize:'1.3rem'}}>GymLog</strong><br/>
          <span style={{color:'#888'}}>{userLang === 'it' ? 'Versione 5.0' : 'Version 5.0'}</span>
        </p>
        
        <p style={{marginBottom:'15px', color:'#ccc'}}>
          {userLang === 'it' ? 'Realizzata con l\'aiuto di Gemini da' : 'Built with the assistance of Gemini by'} <strong>Dr. Claustro</strong>.
        </p>
        
        <p style={{marginBottom:'20px'}}>
          <span style={{color:'#888'}}>{userLang === 'it' ? 'Contatti:' : 'Contacts:'}</span> <a href="mailto:gymlogapplicazione@gmail.com" style={{color:'#e8ff47', textDecoration:'none', fontWeight:'bold'}}>gymlogapplicazione@gmail.com</a>
        </p>
        
        <div style={{borderTop:'1px solid #222', paddingTop:'20px', fontSize:'0.85rem', color:'#888'}}>
          <p style={{marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.05em', color:'#ccc'}}>
            {userLang === 'it' ? 'Licenza di distribuzione' : 'Distribution License'}
          </p>
          <p style={{color:'#aaa', fontWeight:'bold', marginBottom:'10px'}}>
            Creative Commons Attribuzione - Non commerciale - Non opere derivate 4.0 Internazionale (CC BY-NC-ND 4.0)
          </p>
          <p>
            {userLang === 'it' 
              ? "Questa licenza permette a chiunque di scaricare e condividere gratuitamente l'app, a condizione che venga riconosciuta la paternità, che non venga modificata in alcun modo e che non venga mai utilizzata per scopi commerciali o di lucro."
              : "This license allows anyone to download and share the app for free, provided that authorship is acknowledged, that it is not modified in any way, and that it is never used for commercial or profitable purposes."
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Home ────────────────────────────────────────────────────────────────
function HomeView({workouts, sessions, onStart, onSetup, onHistory, onAnalytics, onInstructions, onAbout}) {
  const last=sessions.length>0?sessions.reduce((a,b)=>new Date(a.date)>new Date(b.date)?a:b):null;

  // Icone Vettoriali (SVG)
  const IconConfig = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
  const IconHistory = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 10h6"></path><path d="M9 18h6"></path></svg>;
  const IconAnalytics = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
  const IconBook = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>;
  const IconInfo = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

  return (
    <div>
      <div style={{marginBottom:'32px', textAlign:'center'}}>
        <div style={{fontSize:'0.8rem',letterSpacing:'0.2em',color:'#fff',textTransform:'uppercase',marginBottom:'6px', fontWeight:'bold'}}>
          {new Date().toLocaleDateString(userLang === 'it' ? 'it-IT' : 'en-US',{weekday:'long',day:'numeric',month:'long'})}
        </div>
        <h1 style={{fontSize:'2.4rem',fontWeight:900,color:'#f0f0f0',letterSpacing:'-0.02em'}}>
          GYM<span style={{color:'#e8ff47'}}>LOG</span>
        </h1>
        {last&&<div style={{fontSize:'0.85rem',color:'#aaa',marginTop:'8px'}}>
          {userLang === 'it' ? 'Ultima:' : 'Last:'} {new Date(last.date).toLocaleDateString(userLang === 'it' ? 'it-IT' : 'en-US',{weekday:'short',day:'numeric',month:'short'})} — {last.workoutName}
        </div>}
      </div>

      <div style={{fontSize:'0.7rem',letterSpacing:'0.15em',color:'#aaa',textTransform:'uppercase',marginBottom:'12px', fontWeight:'bold'}}>
        {t('selectWorkout')}
      </div>

      {workouts.map(w=>{
        const ws=sessions.filter(s=>s.workoutId===w.id);
        const wlast=ws.length>0?ws.reduce((a,b)=>new Date(a.date)>new Date(b.date)?a:b):null;
        return (
          <div key={w.id} onClick={()=>onStart(w)} style={{
            background:'#111',border:'1px solid #1e1e1e',borderRadius:'8px',
            padding:'18px',marginBottom:'12px',cursor:'pointer',
            display:'flex',justifyContent:'space-between',alignItems:'center',
          }}>
            <div>
              <div style={{fontWeight:900,fontSize:'1.2rem',color:'#f0f0f0',marginBottom:'6px'}}>{w.name}</div>
              <div style={{fontSize:'0.85rem',color:'#ccc'}}>
                {w.circuits.length} {userLang === 'it' ? 'circuiti' : 'circuits'} · {w.circuits.reduce((n,c)=>n+c.exercises.length,0)} {userLang === 'it' ? 'esercizi' : 'exercises'}
              </div>
              {wlast&&<div style={{fontSize:'0.8rem',color:'#888',marginTop:'4px'}}>
                {userLang === 'it' ? 'Ultima:' : 'Last:'} {new Date(wlast.date).toLocaleDateString(userLang === 'it' ? 'it-IT' : 'en-US',{day:'numeric',month:'short'})}
              </div>}
            </div>
            <span style={{color:'#e8ff47',fontSize:'1.6rem'}}>▶</span>
          </div>
        );
      })}

      {workouts.length===0&&<div style={{textAlign:'center',color:'#ccc',padding:'30px 0',fontSize:'0.9rem'}}>
        {userLang === 'it' ? 'Nessun allenamento configurato. Vai in Configura per iniziare.' : 'No workouts configured. Go to Setup to get started.'}
      </div>}

      <div style={{display:'flex',gap:'10px',marginTop:'32px',flexWrap:'wrap'}}>
        <button onClick={onSetup} style={{...S.secondaryBtn, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
          <IconConfig /> {userLang === 'it' ? 'Configura' : 'Setup'}
        </button>
        <button onClick={onHistory} style={{...S.secondaryBtn, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
          <IconHistory /> {userLang === 'it' ? `Storico (${sessions.length})` : `History (${sessions.length})`}
        </button>
        <button onClick={onAnalytics} style={{...S.secondaryBtn, color:'#000', background:'#e8ff47', borderColor:'#e8ff47', flex:'1 1 100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
          <IconAnalytics /> {t('analyticsTitle')}
        </button>
        
        <div style={{display:'flex', gap:'10px', flex:'1 1 100%'}}>
          <button onClick={onInstructions} style={{...S.secondaryBtn, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', background:'#111', border:'1px solid #2a2a2a', color:'#ccc'}}>
            <IconBook /> {userLang === 'it' ? 'Istruzioni' : 'Guide'}
          </button>
          <button onClick={onAbout} style={{...S.secondaryBtn, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', background:'#111', border:'1px solid #2a2a2a', color:'#ccc'}}>
            <IconInfo /> {userLang === 'it' ? 'Licenza' : 'License'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────
function App() {
  const [workouts,setWorkouts]=useState(()=>lsGet(KEYS.W)||DEFAULT_WORKOUTS);
  const [sessions,setSessions]=useState(()=>lsGet(KEYS.S)||[]);
  
  const [timerMasterEnabled, setTimerMasterEnabled] = useState(() => {
    const saved = lsGet(KEYS.T);
    return saved !== null ? saved : true;
  });
  
  const [activeTimerDuration, setActiveTimerDuration] = useState(0);
  const [timerTriggerKey, setTimerTriggerKey] = useState(0);

  const [view, setView] = useState('home');
  const [active,setActive]=useState(null);

  useEffect(()=>lsSet(KEYS.W,workouts),[workouts]);
  useEffect(()=>lsSet(KEYS.S,sessions),[sessions]);
  useEffect(()=>lsSet(KEYS.T,timerMasterEnabled),[timerMasterEnabled]);

  const saveSession=useCallback(s=>{ setSessions(ss=>[...ss,s]); },[]);
  const deleteSession = useCallback((id) => { setSessions(ss => ss.filter(s => s.id !== id)); }, []);
  const handleImportBackup = useCallback((newWorkouts, newSessions) => { setWorkouts(newWorkouts); setSessions(newSessions); }, []);

  const startTimer = useCallback((seconds) => {
    if (seconds <= 0) return;
    setActiveTimerDuration(seconds);
    setTimerTriggerKey(k => k + 1);
  }, []);

  return (
    <div className="safe-wrap">
      {view==='home'&&<HomeView workouts={workouts} sessions={sessions}
        onStart={w=>{setActive(w);setView('session');}}
        onSetup={()=>setView('setup')} onHistory={()=>setView('history')}
        onAnalytics={()=>setView('analytics')} 
        onInstructions={()=>setView('instructions')} onAbout={()=>setView('about')}/>}
      
{view==='session'&&active&&<SessionView
        workout={workouts.find(w=>w.id===active.id)||active} 
        workouts={workouts}
        setWorkouts={setWorkouts}
        sessions={sessions}
        timerMasterEnabled={timerMasterEnabled} setTimerMasterEnabled={setTimerMasterEnabled}
        startTimer={startTimer}
        onSave={saveSession} onBack={()=>setView('home')}/>}
      
      {view==='setup'&&<SetupView workouts={workouts} setWorkouts={setWorkouts} onBack={()=>setView('home')}/>}
      {view==='history'&&<HistoryView sessions={sessions} workouts={workouts} onDeleteSession={deleteSession} onImportBackup={handleImportBackup} onBack={()=>setView('home')}/>}
      {view==='analytics'&&<AnalyticsView sessions={sessions} workouts={workouts} onBack={()=>setView('home')}/>}
      {view==='instructions'&&<InstructionsView onBack={()=>setView('home')}/>}
      {view==='about'&&<AboutView onBack={()=>setView('home')}/>}

      {activeTimerDuration > 0 && (
        <FloatingTimer 
          duration={activeTimerDuration} 
          triggerKey={timerTriggerKey}
          onCancel={() => setActiveTimerDuration(0)} 
        />
      )}
    </div>
  );
}
export default App;