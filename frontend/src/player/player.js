// ============================================================================
// MIDI Player 引擎（与 UI 解耦的 ES 模块）
//
// 由原 assets/app.js 迁移而来：
//   - 保留全部 Tone.js 音频调度、Canvas 瀑布流渲染、MIDI 解析算法与常量；
//   - 移除全部 DOM 交互（元素查询、事件绑定、文本/HTML 写入、样式写入）；
//   - UI 输入 -> setter 方法；UI 输出 -> hooks 回调。
//
// 依赖（全局对象，均通过 window 暴露）：window.Tone、window.Midi、window.Encoding
// 使用方式：
//   const player = createMidiPlayer({ canvas, wrapper, hooks });
//   player.setLoop(true); await player.loadFile(file);
// ============================================================================

export function createMidiPlayer({ canvas, wrapper, hooks = {} } = {}) {
    if (!canvas) throw new Error('createMidiPlayer: 必须传入 canvas 元素');

    // ==================== UI 回调（全部可选，调用前判空） ====================
    function callHook(name, ...args) {
        const fn = hooks ? hooks[name] : undefined;
        if (typeof fn !== 'function') return undefined;
        try {
            return fn(...args);
        } catch (err) {
            console.warn(`[midiPlayer] hooks.${name} 执行出错:`, err);
            return undefined;
        }
    }

    function onStatus(text) { callHook('onStatus', text); }
    function onLoading(payload) { callHook('onLoading', payload); }
    function onPlaying(payload) { callHook('onPlaying', payload); }
    function onTime(payload) { callHook('onTime', payload); }
    function onMeta(meta) { callHook('onMeta', meta); }
    function onTracks(tracks) { callHook('onTracks', tracks); }
    function onLoaded(payload) { callHook('onLoaded', payload); }
    function onError(message) { callHook('onError', message); }
    function onConfigLoaded(config) { callHook('onConfigLoaded', config); }

    // 主题只影响画布配色，由 Vue 侧提供；缺省回退为深色
    function isLightTheme() {
        const fn = hooks ? hooks.isLightTheme : undefined;
        if (typeof fn !== 'function') return false;
        try { return !!fn(); } catch (err) { return false; }
    }

    // MIDI标准乐器号（Program Number）到 GM 乐器名映射（0-127）
    const GM_PROGRAM_NAMES = [
        "Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet",
        "Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
        "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica", "Tango Accordion",
        "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)", "Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics",
        "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass", "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2",
        "Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani",
        "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2", "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit",
        "Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2",
        "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet",
        "Piccolo", "Flute", "Recorder", "Pan Flute", "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina",
        "Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)", "Lead 5 (charang)", "Lead 6 (voice)", "Lead 7 (fifths)", "Lead 8 (bass+lead)",
        "Pad 1 (new age)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)", "Pad 5 (bowed)", "Pad 6 (metallic)", "Pad 7 (halo)", "Pad 8 (sweep)",
        "FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)", "FX 5 (brightness)", "FX 6 (goblins)", "FX 7 (echoes)", "FX 8 (sci-fi)",
        "Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bag pipe", "Fiddle", "Shanai",
        "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal",
        "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause", "Gunshot"
    ];

    // GM Program 对应的 soundfont 目录名（FluidR3_GM）
    const GM_PROGRAM_IDS = [
        'acoustic_grand_piano', 'bright_acoustic_piano', 'electric_grand_piano', 'honkytonk_piano', 'electric_piano_1', 'electric_piano_2', 'harpsichord', 'clavinet',
        'celesta', 'glockenspiel', 'music_box', 'vibraphone', 'marimba', 'xylophone', 'tubular_bells', 'dulcimer',
        'drawbar_organ', 'percussive_organ', 'rock_organ', 'church_organ', 'reed_organ', 'accordion', 'harmonica', 'tango_accordion',
        'acoustic_guitar_nylon', 'acoustic_guitar_steel', 'electric_guitar_jazz', 'electric_guitar_clean', 'electric_guitar_muted', 'overdriven_guitar', 'distortion_guitar', 'guitar_harmonics',
        'acoustic_bass', 'electric_bass_finger', 'electric_bass_pick', 'fretless_bass', 'slap_bass_1', 'slap_bass_2', 'synth_bass_1', 'synth_bass_2',
        'violin', 'viola', 'cello', 'contrabass', 'tremolo_strings', 'pizzicato_strings', 'orchestral_harp', 'timpani',
        'string_ensemble_1', 'string_ensemble_2', 'synth_strings_1', 'synth_strings_2', 'choir_aahs', 'voice_oohs', 'synth_voice', 'orchestra_hit',
        'trumpet', 'trombone', 'tuba', 'muted_trumpet', 'french_horn', 'brass_section', 'synth_brass_1', 'synth_brass_2',
        'soprano_sax', 'alto_sax', 'tenor_sax', 'baritone_sax', 'oboe', 'english_horn', 'bassoon', 'clarinet',
        'piccolo', 'flute', 'recorder', 'pan_flute', 'blown_bottle', 'shakuhachi', 'whistle', 'ocarina',
        'lead_1_square', 'lead_2_sawtooth', 'lead_3_calliope', 'lead_4_chiff', 'lead_5_charang', 'lead_6_voice', 'lead_7_fifths', 'lead_8_bass_lead',
        'pad_1_new_age', 'pad_2_warm', 'pad_3_polysynth', 'pad_4_choir', 'pad_5_bowed', 'pad_6_metallic', 'pad_7_halo', 'pad_8_sweep',
        'fx_1_rain', 'fx_2_soundtrack', 'fx_3_crystal', 'fx_4_atmosphere', 'fx_5_brightness', 'fx_6_goblins', 'fx_7_echoes', 'fx_8_scifi',
        'sitar', 'banjo', 'shamisen', 'koto', 'kalimba', 'bagpipe', 'fiddle', 'shanai',
        'tinkle_bell', 'agogo', 'steel_drums', 'woodblock', 'taiko_drum', 'melodic_tom', 'synth_drum', 'reverse_cymbal',
        'guitar_fret_noise', 'breath_noise', 'seashore', 'bird_tweet', 'telephone_ring', 'helicopter', 'applause', 'gunshot'
    ];

    const GM_SOUNDFONT_BASE_URL = window.location.origin + '/api/soundfonts/FluidR3_GM/';
    const GM_SPARSE_SAMPLE_URLS = {
        'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Eb1.mp3', 'F#1': 'Gb1.mp3',
        'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Eb2.mp3', 'F#2': 'Gb2.mp3',
        'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Eb3.mp3', 'F#3': 'Gb3.mp3',
        'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Eb4.mp3', 'F#4': 'Gb4.mp3',
        'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Eb5.mp3', 'F#5': 'Gb5.mp3',
        'A5': 'A5.mp3', 'C6': 'C6.mp3', 'D#6': 'Eb6.mp3', 'F#6': 'Gb6.mp3',
        'A6': 'A6.mp3', 'C7': 'C7.mp3', 'D#7': 'Eb7.mp3', 'F#7': 'Gb7.mp3',
        'A7': 'A7.mp3', 'C8': 'C8.mp3'
    };

    function normalizeProgramNumber(program) {
        if (typeof program !== 'number' || Number.isNaN(program)) return null;
        if (program >= 0 && program <= 127) return program;
        if (program === 128) return 127;
        return null;
    }

    function getTrackProgramInfo(track, midi) {
        let program = null;
        let noteChannel = null;
        let isPercussion = false;

        if (track.notes && track.notes.length > 0 && typeof track.notes[0].channel === 'number') {
            noteChannel = track.notes[0].channel;
            if (noteChannel === 9) isPercussion = true;
        }

        if (track.instrument && typeof track.instrument === 'object') {
            if (track.instrument.percussion) isPercussion = true;
            const instNum = normalizeProgramNumber(track.instrument.number);
            if (instNum !== null) program = instNum;
        }

        if (program === null && typeof track.programNumber === 'number') program = normalizeProgramNumber(track.programNumber);
        if (program === null && typeof track.instrument === 'number') program = normalizeProgramNumber(track.instrument);
        if (program === null && Array.isArray(track.events)) {
            for (const ev of track.events) {
                if (ev.type === 'programChange' && typeof ev.programNumber === 'number') {
                    program = normalizeProgramNumber(ev.programNumber);
                    if (typeof ev.channel === 'number' && ev.channel === 9) isPercussion = true;
                    break;
                }
            }
        }

        if (program === null && typeof noteChannel === 'number') {
            outer: for (const t of midi.tracks) {
                if (!Array.isArray(t.events)) continue;
                for (const ev of t.events) {
                    if (ev.type === 'programChange' && ev.channel === noteChannel && typeof ev.programNumber === 'number') {
                        program = normalizeProgramNumber(ev.programNumber);
                        break outer;
                    }
                }
            }
        }

        return { program, isPercussion };
    }

    function getInstrumentNameFromTrack(track, midi) {
        const trackProgramInfo = getTrackProgramInfo(track, midi);
        if (track.instrument && typeof track.instrument === 'object') {
            if (trackProgramInfo.isPercussion) return 'Standard Drum Kit';
            if (typeof track.instrument.name === 'string' && track.instrument.name.trim()) return track.instrument.name.trim();
            const instNum = trackProgramInfo.program;
            if (instNum !== null) return GM_PROGRAM_NAMES[instNum] || '';
        }
        if (trackProgramInfo.isPercussion) return 'Standard Drum Kit';
        if (trackProgramInfo.program !== null) return GM_PROGRAM_NAMES[trackProgramInfo.program] || '';
        return '';
    }


    // ==================== 配置 ====================
    function getDefaultCanvasSize() {
        const width = window.innerWidth > 1440 ? 1440 : (window.innerWidth * 0.95);
        const height = window.innerWidth <= 768 ? width * 1.0 : 720;
        return { width, height };
    }

    let { width: WIDTH, height: HEIGHT } = getDefaultCanvasSize();
    const DEFAULT_SPEED = 256;
    let SPEED = DEFAULT_SPEED;
    const THICKNESS = 8;
    const MARGIN = 20;
    const FADE_TIME = 3.3;
    const FADE_IN_DIST = WIDTH;
    const FADE_IN_TIME = FADE_IN_DIST / SPEED;

    // 判定线位置比例 (0.1-0.9)
    let hitLinePosition = 0.5;

    // ==================== 粒子系统 ====================
    let particles = [];

    class Particle {
        constructor() {
            this.active = false;
            this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.life = 0; this.decay = 0; this.size = 0; this.color = 'rgba(255,255,255,1)';
        }
        init(x, y, color) {
            this.active = true;
            this.x = x; this.y = y; this.color = color;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.life = 1.0;
            this.decay = Math.random() * 0.02 + 0.015;
            this.size = Math.random() * 4 + 2;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.1;
            this.life -= this.decay;
            this.size *= 0.98;
            if (this.life <= 0) this.active = false;
        }
        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // 简单对象池
    const PARTICLE_POOL_SIZE = 4096;
    const particlePool = [];
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) particlePool.push(new Particle());

    function acquireParticle() {
        for (let i = 0; i < particlePool.length; i++) {
            const p = particlePool[i];
            if (!p.active) return p;
        }
        return null; // 池耗尽时返回null，避免无限增长
    }

    function createParticles(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            const p = acquireParticle();
            if (!p) break;
            p.init(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, color);
            particles.push(p);
        }
    }

    // ==================== 加载进度（改为 hooks 输出） ====================
    let loadingPercent = 0;
    let hideLoadingTimer = 0;

    function showLoading() {
        loadingPercent = 0;
        onLoading({ visible: true, percent: 0 });
    }

    function hideLoading() {
        onLoading({ visible: false, percent: Math.round(loadingPercent) });
    }

    function updateLoadingProgress(percent) {
        loadingPercent = percent;
        onLoading({ visible: true, percent: percent });
    }

    // ==================== 画布与设置 ====================
    const ctx = canvas.getContext('2d');

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // 单一设置来源：所有 setter 先更新它，再触发重绘 / saveConfig()
    const settings = {
        volume: -6,
        speed: DEFAULT_SPEED,
        playbackRate: 1,
        hitLinePosition: 0.5,
        direction: 'horizontal',
        particles: true,
        glow: true,
        shake: true,
        shakeIntensity: 4,
        particleLimit: 1024,
        info: true,
        velocity: true,
        theme: 'system'
    };

    // ==================== 状态 ====================
    let notes = [];
    let gridLines = [];
    let isPlaying = false;
    let currentTime = 0;
    let totalDuration = 0;
    let isLoopEnabled = false;
    let loadedFileName = null;
    // 瀑布流方向：'horizontal' | 'vertical'
    let flowDirection = 'horizontal';
    // 渲染循环 / 过渡动画的 requestAnimationFrame 句柄（destroy 时可取消）
    let renderRaf = 0;
    let transitionRaf = 0;

    // ==================== 特效开关状态 ====================
    let enableParticles = true;  // 粒子特效开关
    let enableGlow = true;       // 音符发光开关
    let maxParticlesPerFrame = 1024; // 每帧最大粒子数量（默认值）
    let unlimitedParticles = false;  // 是否无限制粒子数量
    let enableShake = true;      // 屏幕震动开关
    let shakeIntensity = 4;      // 震动幅度

    // ==================== 音轨控制 ====================
    const trackHues = [200, 280, 120, 30, 320, 60];
    let trackInfo = [];
    let midiMeta = null;

    function getKeySignatureName(keyFifths) {
        const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
        const flatKeys = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
        if (keyFifths >= 0) return keys[keyFifths] || 'C';
        else return flatKeys[Math.abs(keyFifths)] || 'C';
    }

    function extractMidiMeta(midi, fileName) {
        const tempos = midi.header.tempos || [];
        const bpm = tempos.length > 0 ? Math.round(tempos[0].bpm) : 120;
        const timeSigs = midi.header.timeSignatures || [];
        let timeSig = '4/4';
        if (timeSigs.length > 0) {
            const ts = timeSigs[0];
            if (Array.isArray(ts.timeSignature)) timeSig = `${ts.timeSignature[0]}/${ts.timeSignature[1]}`;
            else if (ts.numerator !== undefined) timeSig = `${ts.numerator}/${ts.denominator || 4}`;
        }
        let keySig = 'C';
        const keySigs = midi.header.keySignatures || [];
        if (keySigs.length > 0) keySig = getKeySignatureName(keySigs[0].key || 0);
        let totalNotes = 0;
        midi.tracks.forEach(track => { totalNotes += track.notes.length; });
        midiMeta = { fileName, bpm, timeSig, keySig, totalNotes };
        onMeta(midiMeta);
    }

    function emitTracks() {
        onTracks(trackInfo);
    }

    function midiToNoteName(midi) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const note = noteNames[midi % 12];
        return note + octave;
    }

    function extractTrackInfo(midi) {
        trackInfo = [];
        let trackIndex = 0;
        midi.tracks.forEach((track, idx) => {
            if (track.notes.length > 0) {
                let name = '';
                if (track.name) {
                    let candidates = [];
                    let bytes = null;
                    if (typeof track.name === 'string') {
                        candidates.push(track.name);
                        let arr = [];
                        for (let i = 0; i < track.name.length; i++) arr.push(track.name.charCodeAt(i) & 0xFF);
                        bytes = new Uint8Array(arr);
                    } else if (track.name instanceof Uint8Array) bytes = track.name;
                    else if (track.name instanceof ArrayBuffer) bytes = new Uint8Array(track.name);
                    else if (Array.isArray(track.name)) bytes = new Uint8Array(track.name);
                    if (bytes) {
                        try { candidates.push(new TextDecoder('utf-8').decode(bytes)); } catch { }
                        try { candidates.push(window.Encoding.convert(bytes, { to: 'UNICODE', type: 'string' })); } catch { }
                        try { candidates.push(window.Encoding.convert(bytes, { to: 'UNICODE', type: 'string', from: 'BIG5' })); } catch { }
                    }
                    let best = '';
                    let maxLen = 0;
                    for (const s of candidates) {
                        if (!s) continue;
                        let cleaned = s.replace(/[\x00\u0000\0]/g, '').trim();
                        if (/[\u4e00-\u9fa5]/.test(cleaned) && cleaned.length > maxLen) { best = cleaned; maxLen = cleaned.length; }
                        else if (!best && cleaned.length > maxLen) { best = cleaned; maxLen = cleaned.length; }
                    }
                    name = best;
                }
                if (!name || name === '') name = `音轨 ${trackIndex + 1}`;
                const trackProgramInfo = getTrackProgramInfo(track, midi);
                const instrumentName = getInstrumentNameFromTrack(track, midi);
                if (name.length > 20) name = name.substring(0, 17) + '...';
                let minMidi = 127, maxMidi = 0;
                track.notes.forEach(note => {
                    if (note.midi < minMidi) minMidi = note.midi;
                    if (note.midi > maxMidi) maxMidi = note.midi;
                });
                const noteRange = `${midiToNoteName(minMidi)} - ${midiToNoteName(maxMidi)}`;

                // 提取轨道音量事件（CC7 - Channel Volume）
                let initialVolume = 1.0; // 默认音量
                let cc7Events = []; // CC7事件列表

                if (Array.isArray(track.controlChanges) && track.controlChanges[7]) {
                    // CC7是主控音量，值范围0-127
                    const volumeEvents = track.controlChanges[7];
                    if (volumeEvents.length > 0) {
                        // 使用第一个音量事件作为初始音量
                        const firstVolumeEvent = volumeEvents[0];
                        initialVolume = firstVolumeEvent.value / 127.0;

                        // 记录所有CC7事件用于展示
                        cc7Events = volumeEvents.map(event => ({
                            time: event.time,
                            value: event.value,
                            percent: Math.round((event.value / 127.0) * 100)
                        }));
                    }
                }

                trackInfo.push({
                    name, instrumentName: instrumentName || '', noteCount: track.notes.length, noteRange,
                    enabled: true, volume: initialVolume,
                    instrument: 'midi_auto', gmProgram: trackProgramInfo.program, isPercussion: trackProgramInfo.isPercussion,
                    hue: trackHues[trackIndex % trackHues.length],
                    cc7Events: cc7Events // 保存CC7事件列表
                });
                trackIndex++;
            }
        });
        emitTracks();
    }

    // ==================== 小节线信息显示过渡 ====================
    let targetExtraInfoAlpha = 1;
    let currentExtraInfoAlpha = 1;
    const FADE_SPEED = 0.05;

    function animateTransition() {
        if (Math.abs(currentExtraInfoAlpha - targetExtraInfoAlpha) > 0.01) {
            drawFrame(currentTime);
            transitionRaf = requestAnimationFrame(animateTransition);
        } else {
            currentExtraInfoAlpha = targetExtraInfoAlpha;
            transitionRaf = 0;
            drawFrame(currentTime);
        }
    }

    // ==================== 音频 ====================
    const LOCAL_SF = window.location.origin + '/api/soundfonts/';
    const SAMPLER_CONFIGS = {
        'violin': { name: '小提琴', baseUrl: LOCAL_SF + "FatBoy/violin-mp3/", enhance: 18 },
        'viola': { name: '中提琴', baseUrl: LOCAL_SF + "FatBoy/viola-mp3/", enhance: 12 },
        'cello': { name: '大提琴', baseUrl: LOCAL_SF + "FatBoy/cello-mp3/", enhance: 18 },
        'piccolo': { name: '短笛', baseUrl: LOCAL_SF + "FatBoy/piccolo-mp3/", enhance: 15 },
        'flute': { name: '长笛', baseUrl: LOCAL_SF + "FatBoy/flute-mp3/", enhance: 15 },
        'acoustic_guitar': { name: '吉他', baseUrl: LOCAL_SF + "FatBoy/acoustic_guitar_nylon-mp3/", enhance: 24 },
        'music_box': { name: '八音盒', baseUrl: LOCAL_SF + "FatBoy/music_box-mp3/", enhance: 21 },
        'shamisen': { name: '三味线', baseUrl: LOCAL_SF + "FatBoy/shamisen-mp3/", enhance: 9 },
        'voice': { name: '人声', baseUrl: LOCAL_SF + "FluidR3_GM/voice_oohs-mp3/", enhance: 0 }
    };

    const masterVolume = new Tone.Volume(-6).toDestination();
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.2 }).connect(masterVolume);
    // 最大复音数由滑块动态控制，默认64
    let currentMaxPolyphony = 64;
    let currentInstrument = new Tone.PolySynth(Tone.Synth, { maxPolyphony: currentMaxPolyphony }).connect(reverb);
    let playbackRate = 1;
    const instrumentPool = { 'default': currentInstrument };

    function getTrackResolvedInstrumentType(track) {
        if (!track) return 'default';
        if (track.instrument === 'midi_auto') {
            if (track.isPercussion) return 'gm_drum';
            if (typeof track.gmProgram === 'number' && track.gmProgram >= 0 && track.gmProgram < GM_PROGRAM_IDS.length) return `gm:${track.gmProgram}`;
            return 'default';
        }
        return track.instrument || 'default';
    }

    async function preloadAutoTrackInstruments() {
        const typesToLoad = new Set();
        trackInfo.forEach(track => {
            if (track.instrument === 'midi_auto') {
                const resolvedType = getTrackResolvedInstrumentType(track);
                if (resolvedType && resolvedType !== 'default') typesToLoad.add(resolvedType);
            }
        });
        const loadList = Array.from(typesToLoad);
        for (let i = 0; i < loadList.length; i++) {
            onStatus(`正在加载 MIDI 音库 ${i + 1}/${loadList.length}...`);
            await getInstrumentInstance(loadList[i]);
        }
    }

    async function getInstrumentInstance(type) {
        if (instrumentPool[type]) return instrumentPool[type];
        let inst;
        if (type === 'gm_drum') {
            inst = new Tone.PolySynth(Tone.MembraneSynth, { maxPolyphony: currentMaxPolyphony, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 } });
        } else if (type.startsWith('gm:')) {
            const program = parseInt(type.slice(3), 10);
            const gmId = GM_PROGRAM_IDS[program];
            if (!gmId) inst = new Tone.PolySynth(Tone.Synth, { maxPolyphony: currentMaxPolyphony });
            else {
                const gmName = GM_PROGRAM_NAMES[program] || gmId;
                onStatus(`正在加载 GM 音色: ${gmName}...`);
                inst = new Tone.Sampler({ urls: GM_SPARSE_SAMPLE_URLS, release: 1.1, baseUrl: `${GM_SOUNDFONT_BASE_URL}${gmId}-mp3/`, onload: () => { onStatus(`GM 音色已就绪: ${gmName}`); inst.volume.value = 6; } });
            }
        } else if (type === 'fm') inst = new Tone.PolySynth(Tone.FMSynth, { maxPolyphony: currentMaxPolyphony });
        else if (type === 'am') inst = new Tone.PolySynth(Tone.AMSynth, { maxPolyphony: currentMaxPolyphony });
        else if (type === 'fat') inst = new Tone.PolySynth(Tone.Synth, { maxPolyphony: currentMaxPolyphony, oscillator: { type: "fatsawtooth" } });
        else if (type === 'piano') {
            onStatus('正在加载 钢琴 采样...');
            inst = new Tone.Sampler({
                urls: { "A0": "A0.mp3", "C1": "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3", "A1": "A1.mp3", "C2": "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3", "A2": "A2.mp3", "C3": "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", "A3": "A3.mp3", "C4": "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", "A4": "A4.mp3", "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", "A5": "A5.mp3", "C6": "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3", "A6": "A6.mp3", "C7": "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3", "A7": "A7.mp3", "C8": "C8.mp3" },
                release: 1.2, baseUrl: LOCAL_SF + "salamander/",
                onload: () => { onStatus('钢琴音色就绪 (Salamander 三角钢琴)'); inst.connect(reverb); inst.volume.value = 3; }
            });
        } else if (type in SAMPLER_CONFIGS) {
            const config = SAMPLER_CONFIGS[type];
            onStatus(`正在加载 ${config.name} 采样...`);
            inst = new Tone.Sampler({
                urls: { "A0": "A0.mp3", "B0": "B0.mp3", "C1": "C1.mp3", "D1": "D1.mp3", "E1": "E1.mp3", "F1": "F1.mp3", "G1": "G1.mp3", "A1": "A1.mp3", "B1": "B1.mp3", "C2": "C2.mp3", "D2": "D2.mp3", "E2": "E2.mp3", "F2": "F2.mp3", "G2": "G2.mp3", "A2": "A2.mp3", "B2": "B2.mp3", "C3": "C3.mp3", "D3": "D3.mp3", "E3": "E3.mp3", "F3": "F3.mp3", "G3": "G3.mp3", "A3": "A3.mp3", "B3": "B3.mp3", "C4": "C4.mp3", "D4": "D4.mp3", "E4": "E4.mp3", "F4": "F4.mp3", "G4": "G4.mp3", "A4": "A4.mp3", "B4": "B4.mp3", "C5": "C5.mp3", "D5": "D5.mp3", "E5": "E5.mp3", "F5": "F5.mp3", "G5": "G5.mp3", "A5": "A5.mp3", "B5": "B5.mp3", "C6": "C6.mp3", "D6": "D6.mp3", "E6": "E6.mp3", "F6": "F6.mp3", "G6": "G6.mp3", "A6": "A6.mp3", "B6": "B6.mp3", "C7": "C7.mp3", "D7": "D7.mp3", "E7": "E7.mp3", "F7": "F7.mp3", "G7": "G7.mp3", "A7": "A7.mp3", "B7": "B7.mp3", "C8": "C8.mp3", "G#1": "Ab1.mp3", "A#0": "Bb0.mp3", "C#1": "Db1.mp3", "D#1": "Eb1.mp3", "F#1": "Gb1.mp3", "G#2": "Ab2.mp3", "A#1": "Bb1.mp3", "C#2": "Db2.mp3", "D#2": "Eb2.mp3", "F#2": "Gb2.mp3", "G#3": "Ab3.mp3", "A#2": "Bb2.mp3", "C#3": "Db3.mp3", "D#3": "Eb3.mp3", "F#3": "Gb3.mp3", "G#4": "Ab4.mp3", "A#3": "Bb3.mp3", "C#4": "Db4.mp3", "D#4": "Eb4.mp3", "F#4": "Gb4.mp3", "G#5": "Ab5.mp3", "A#4": "Bb4.mp3", "C#5": "Db5.mp3", "D#5": "Eb5.mp3", "F#5": "Gb5.mp3", "G#6": "Ab6.mp3", "A#5": "Bb5.mp3", "C#6": "Db6.mp3", "D#6": "Eb6.mp3", "F#6": "Gb6.mp3", "G#7": "Ab7.mp3", "A#6": "Bb6.mp3", "C#7": "Db7.mp3", "D#7": "Eb7.mp3", "F#7": "Gb7.mp3", "A#7": "Bb7" },
                release: 1.2, baseUrl: config.baseUrl,
                onload: () => { onStatus(`${config.name} 音色就绪`); inst.connect(reverb); inst.volume.value = config.enhance; }
            });
        } else {
            inst = new Tone.PolySynth(Tone.Synth, { maxPolyphony: currentMaxPolyphony });
        }
        if (typeof reverb !== 'undefined') inst.connect(reverb);
        else inst.connect(masterVolume);
        instrumentPool[type] = inst;
        if (typeof inst.loaded === 'boolean' && inst.loaded === false) {
            try { await Tone.loaded(); } catch (err) { console.warn('音色采样加载失败，回退默认合成器:', type, err); if (type.startsWith('gm:')) { instrumentPool[type] = instrumentPool['default']; return instrumentPool[type]; } }
        }
        return inst;
    }

    // 注：原实现在此同步滑块数值文本，现已交由 Vue 侧展示
    function applyPlaybackRate() {
        if (isPlaying && notes.length > 0) scheduleTransportFrom(currentTime);
    }

    // ==================== 核心：网格解析引擎 ====================
    function parseMidiGrid(midi) {
        const lines = [];
        const ppq = midi.header.ppq || 480;
        const tempos = midi.header.tempos && midi.header.tempos.length > 0 ? midi.header.tempos : [{ ticks: 0, bpm: 120 }];
        let timeSigs = midi.header.timeSignatures && midi.header.timeSignatures.length > 0 ? midi.header.timeSignatures : [{ ticks: 0, timeSignature: [4, 4] }];
        function getSecondsFromTick(targetTick) {
            let time = 0, lastTick = 0, lastBpm = tempos[0].bpm;
            for (let i = 0; i < tempos.length; i++) {
                let tempo = tempos[i];
                if (tempo.ticks > targetTick) break;
                let deltaTicks = tempo.ticks - lastTick;
                time += deltaTicks * (60 / lastBpm / ppq);
                lastTick = tempo.ticks;
                lastBpm = tempo.bpm;
            }
            let remainingTicks = targetTick - lastTick;
            time += remainingTicks * (60 / lastBpm / ppq);
            return time;
        }
        let maxTick = 0;
        midi.tracks.forEach(track => { track.notes.forEach(note => { if (note.ticks + note.durationTicks > maxTick) maxTick = note.ticks + note.durationTicks; }); });
        maxTick += ppq * 16;
        let currentTick = 0, timeSigIndex = 0, measureCount = 1;
        while (currentTick <= maxTick) {
            let currentSig = timeSigs[timeSigIndex];
            while (timeSigIndex + 1 < timeSigs.length && timeSigs[timeSigIndex + 1].ticks <= currentTick) { timeSigIndex++; currentSig = timeSigs[timeSigIndex]; }
            let num = 4, den = 4;
            if (Array.isArray(currentSig.timeSignature)) { num = currentSig.timeSignature[0]; den = currentSig.timeSignature[1]; }
            else if (currentSig.numerator && currentSig.denominator) { num = currentSig.numerator; den = currentSig.denominator; }
            let ticksPerBeat = ppq * (4 / den);
            let ticksPerMeasure = ticksPerBeat * num;
            lines.push({ time: getSecondsFromTick(currentTick), isMeasure: true, label: `Bar ${measureCount} (${num}/${den})` });
            for (let b = 1; b < num; b++) lines.push({ time: getSecondsFromTick(currentTick + b * ticksPerBeat), isMeasure: false });
            currentTick += Math.round(ticksPerMeasure);
            measureCount++;
        }
        return lines;
    }

    // ==================== 进度输出 ====================
    function getEffectivePlaybackRate() { return Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1; }
    function toTransportTime(songTime) { return songTime / getEffectivePlaybackRate(); }
    function toSongTime(transportTime) { return transportTime * getEffectivePlaybackRate(); }

    function updateProgressUI() {
        if (totalDuration > 0) {
            onTime({ current: currentTime, total: totalDuration });
        } else {
            onTime({ current: 0, total: 0 });
        }
    }

    function scheduleTransportFrom(songStartTime) {
        if (notes.length === 0) return;
        Tone.Transport.stop();
        Tone.Transport.cancel();
        notes.forEach(note => { if (note.time >= songStartTime) scheduleNoteToTransport(note); });
        const lastNote = notes[notes.length - 1].time;
        const loopEnd = toTransportTime(lastNote + 0.5);
        Tone.Transport.loop = false;
        Tone.Transport.schedule(() => {
            if (!isPlaying) return;
            if (isLoopEnabled) { currentTime = 0; scheduleTransportFrom(0); } else { stopPlay(true); }
        }, loopEnd);
        Tone.Transport.start(undefined, toTransportTime(songStartTime));
    }

    // ==================== 工具：停止并清理 ====================
    function resetPlaybackState(resetToStart = true) {
        isPlaying = false;
        Tone.Transport.loop = false;
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (resetToStart) currentTime = 0;
        particles = [];
        if (renderRaf) { cancelAnimationFrame(renderRaf); renderRaf = 0; }
        updateProgressUI();
    }

    function clearLoadedMidiData() {
        notes = []; gridLines = []; totalDuration = 0; currentTime = 0;
        trackInfo = []; midiMeta = null; loadedFileName = null;
        onMeta(null); emitTracks(); updateProgressUI(); drawFrame(0);
    }

    function stopAndClear() { resetPlaybackState(true); clearLoadedMidiData(); }

    // ==================== 加载 MIDI ====================
    async function loadFile(file) {
        if (!file) return;
        stopAndClear();
        showLoading();
        onStatus('正在加载...');

        try {
            updateLoadingProgress(10);
            const buffer = await file.arrayBuffer();

            updateLoadingProgress(30);
            const midi = new Midi(buffer);

            updateLoadingProgress(50);
            gridLines = parseMidiGrid(midi);
            extractMidiMeta(midi, file.name);

            updateLoadingProgress(60);
            notes = [];
            let minMidi = 127, maxMidi = 0, trackIndex = 0;
            extractTrackInfo(midi);

            updateLoadingProgress(75);
            await preloadAutoTrackInstruments();

            updateLoadingProgress(85);
            midi.tracks.forEach(track => {
                if (track.notes.length > 0) {
                    const trackColor = trackIndex;
                    track.notes.forEach(note => {
                        notes.push({ midi: note.midi, time: note.time, duration: note.duration, name: note.name, velocity: note.velocity || 0.8, track: trackColor });
                        minMidi = Math.min(minMidi, note.midi);
                        maxMidi = Math.max(maxMidi, note.midi);
                    });
                    trackIndex++;
                }
            });

            updateLoadingProgress(95);
            notes.sort((a, b) => a.time - b.time);
            window.midiRange = { min: Math.max(0, minMidi - 1), max: Math.min(127, maxMidi + 1) };
            loadedFileName = file.name;
            onStatus(`已加载: ${file.name} (${notes.length} 个音符)`);
            totalDuration = notes[notes.length - 1].time + notes[notes.length - 1].duration;
            updateProgressUI();
            drawFrame(0);

            updateLoadingProgress(100);
            if (hideLoadingTimer) clearTimeout(hideLoadingTimer);
            hideLoadingTimer = setTimeout(() => { hideLoadingTimer = 0; hideLoading(); }, 300);
            onLoaded({ name: file.name, notes: notes.length, totalDuration });
        } catch (err) {
            console.error('加载失败:', err);
            const message = err && err.message ? err.message : String(err);
            onStatus('加载失败: ' + message);
            onError(message);
            hideLoading();
        }
    }

    // ==================== 拖放加载 MIDI（body 级） ====================
    let dragCounter = 0;

    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        if (dragCounter === 1) {
            document.body.classList.add('drag-over');
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            document.body.classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        document.body.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const name = file.name.toLowerCase();
            if (name.endsWith('.mid') || name.endsWith('.midi')) {
                loadFile(file);
            } else {
                onStatus('不支持的文件格式，请拖入 .mid 或 .midi 文件');
            }
        }
    }

    function scheduleNoteToTransport(note) {
        const noteStart = toTransportTime(note.time);
        const noteDuration = Math.max(0.01, note.duration / getEffectivePlaybackRate());
        Tone.Transport.schedule((time) => {
            const track = trackInfo[note.track];
            if (!track || !track.enabled || track.volume === 0) return;
            const targetType = getTrackResolvedInstrumentType(track);
            const inst = instrumentPool[targetType] || instrumentPool['default'];
            if (inst) {
                const finalVelocity = Math.max(0, Math.min(1, note.velocity * track.volume));
                if (finalVelocity > 0.01) {
                    inst.triggerAttackRelease(note.name, noteDuration, time, finalVelocity);
                    // 只有开启粒子特效时才创建粒子
                    if (enableParticles) {
                        const isHorizontal = flowDirection === 'horizontal';
                        const hitX = WIDTH * hitLinePosition;
                        const hitY = HEIGHT * hitLinePosition;
                        let particleX, particleY;
                        if (isHorizontal) { particleX = hitX; particleY = midiToY(note.midi); }
                        else { particleX = midiToX(note.midi); particleY = hitY; }
                        const track = trackInfo.length > 0 && trackInfo[note.track] ? trackInfo[note.track] : null;
                        const trackVolume = track ? track.volume : 1.0;
                        const alpha = trackVolume * note.velocity;

                        // 计算击打瞬间的音符渲染颜色，与 drawFrame 中的渲染逻辑保持一致
                        // 击打瞬间音符跨越判定线，使用彩色渲染
                        const trackHue = track ? track.hue : trackHues[note.track % trackHues.length];
                        const hue = trackHue + note.velocity * 20;
                        const isLight = isLightTheme();
                        const lightness = isLight ? 60 : 55;
                        const particleColor = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;

                        // 减少粒子数量：从10-25个改为5-12个，但受全局限制
                        const requestedCount = Math.floor(5 + note.velocity * 7);
                        let particleCount;
                        if (unlimitedParticles) {
                            // 无限制模式：直接创建请求的数量
                            particleCount = requestedCount;
                        } else {
                            // 有限制模式：计算可用槽位
                            const availableSlots = maxParticlesPerFrame - particles.length;
                            particleCount = Math.min(requestedCount, Math.max(0, availableSlots));
                        }
                        if (particleCount > 0) {
                            createParticles(particleX, particleY, particleColor, particleCount);
                        }
                    }
                }
            }
        }, noteStart);
    }

    // ==================== 播放控制（基于 Tone.Transport） ====================
    async function startPlay() {
        if (notes.length === 0) return;
        await Tone.start();
        applyPlaybackRate();
        isPlaying = true;
        onPlaying({ playing: true });
        onStatus('播放中...');
        const startOffset = currentTime;
        scheduleTransportFrom(startOffset);
        currentTime = startOffset;
        if (renderRaf) cancelAnimationFrame(renderRaf);
        renderRaf = requestAnimationFrame(renderLoop);
    }

    function pausePlay() {
        isPlaying = false;
        Tone.Transport.pause();
        if (renderRaf) { cancelAnimationFrame(renderRaf); renderRaf = 0; }
        onPlaying({ playing: false });
        onStatus('已暂停');
    }

    function stopPlay(isEnd = false) {
        resetPlaybackState(true);
        onPlaying({ playing: false });
        onStatus(isEnd ? '播放完毕' : '已停止');
        if (notes.length > 0) drawFrame(0);
    }

    function togglePlay() { if (isPlaying) pausePlay(); else startPlay(); }

    // ==================== 渲染 ====================
    function renderLoop() {
        if (!isPlaying) { renderRaf = 0; return; }
        currentTime = Math.min(totalDuration, toSongTime(Tone.Transport.seconds));
        updateProgressUI();
        drawFrame(currentTime);
        renderRaf = requestAnimationFrame(renderLoop);
    }

    function midiToX(midi) {
        const range = window.midiRange || { min: 48, max: 84 };
        const availableWidth = WIDTH - 2 * MARGIN;
        const normalized = (midi - range.min) / (range.max - range.min);
        return MARGIN + normalized * availableWidth;
    }

    function midiToY(midi) {
        const range = window.midiRange || { min: 48, max: 84 };
        const availableHeight = HEIGHT - 2 * MARGIN;
        const normalized = (midi - range.min) / (range.max - range.min);
        return MARGIN + (1 - normalized) * availableHeight;
    }

    // 震动幅度基准：滑块值对应 1360px 画布下的位移，
    // 实际位移随画布尺寸等比缩放，否则高分屏（大画布）上几乎看不出震动
    const SHAKE_REFERENCE_SIZE = 1360;
    function getShakeScale() {
        return Math.max(WIDTH, HEIGHT) / SHAKE_REFERENCE_SIZE;
    }

    function drawFrame(now) {
        if (currentExtraInfoAlpha < targetExtraInfoAlpha) currentExtraInfoAlpha = Math.min(1, currentExtraInfoAlpha + FADE_SPEED);
        else if (currentExtraInfoAlpha > targetExtraInfoAlpha) currentExtraInfoAlpha = Math.max(0, currentExtraInfoAlpha - FADE_SPEED);
        const shouldDrawExtra = currentExtraInfoAlpha > 0;

        const isLight = isLightTheme();
        const bgColor = isLight ? '#ffffff' : '#000000';
        const gridColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
        const centerLineColor = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
        const textColor = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
        const measureColor = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';
        const beatColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // 统计当前击打判定线的音符数量 -> 控制屏幕震动（仅击打瞬间）
        let shakeAmount = 0;
        if (enableShake && shakeIntensity > 0) {
            let hitMoment = 0;
            for (const note of notes) {
                if (trackInfo.length > 0 && !trackInfo[note.track]?.enabled) continue;
                const td = note.time - now;
                // 只在音符刚触碰判定线的瞬间（50ms内）触发震动
                if (td > -0.05 && td <= 0) hitMoment++;
            }
            shakeAmount = Math.min(Math.pow(hitMoment, 1.4) * 0.25, shakeIntensity) * getShakeScale();
        }
        if (shakeAmount > 0.5) {
            const sx = (Math.random() - 0.5) * shakeAmount * 2;
            const sy = (Math.random() - 0.5) * shakeAmount * 2;
            ctx.save();
            ctx.translate(sx, sy);
        }

        const isHorizontal = flowDirection === 'horizontal';
        const hitX = WIDTH * hitLinePosition;
        const hitY = HEIGHT * hitLinePosition;

        ctx.strokeStyle = centerLineColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (isHorizontal) ctx.moveTo(hitX, 0), ctx.lineTo(hitX, HEIGHT);
        else ctx.moveTo(0, hitY), ctx.lineTo(WIDTH, hitY);
        ctx.stroke();

        const range = window.midiRange || { min: 48, max: 84 };
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.font = '12px Segoe UI, sans-serif';
        for (let i = range.min; i <= range.max; i++) {
            ctx.beginPath();
            if (isHorizontal) {
                const y = midiToY(i);
                ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
                if (shouldDrawExtra && i % 12 === 0) { ctx.fillStyle = textColor; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(midiToNoteName(i), hitX - 10, y); }
            } else {
                const x = midiToX(i);
                ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
                if (shouldDrawExtra && i % 12 === 0) { ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(midiToNoteName(i), x, hitY + 10); }
            }
        }

        if (shouldDrawExtra && gridLines.length > 0) {
            gridLines.forEach(line => {
                const timeDelta = line.time - now;
                if (isHorizontal) {
                    const x = hitX + timeDelta * SPEED;
                    if (x >= -20 && x <= WIDTH + 20) {
                        ctx.strokeStyle = line.isMeasure ? measureColor : beatColor;
                        ctx.lineWidth = line.isMeasure ? 2 : 1;
                        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
                        if (line.isMeasure && line.label) { ctx.fillStyle = textColor; ctx.font = 'bold 13px "Segoe UI", Tahoma, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(line.label, x + 10, 22); }
                    }
                } else {
                    const y = hitY - timeDelta * SPEED;
                    if (y >= -20 && y <= HEIGHT + 20) {
                        ctx.strokeStyle = line.isMeasure ? measureColor : beatColor;
                        ctx.lineWidth = line.isMeasure ? 2 : 1;
                        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
                        if (line.isMeasure && line.label) { ctx.fillStyle = textColor; ctx.font = 'bold 13px "Segoe UI", Tahoma, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(line.label, 10, y - 5); }
                    }
                }
            });
        }

        const isMobile = window.innerWidth <= 768;
        const GLOW_BLUR = isMobile ? 10 : 30;

        // 最流畅的混合模式
        ctx.globalCompositeOperation = 'source-over';

        notes.forEach(note => {
            const timeDelta = note.time - now;
            const timeSinceEnd = now - (note.time + note.duration);

            // 动态计算音符加载范围：根据瀑布流速度和屏幕尺寸调整
            // 水平模式：音符从右向左移动，需要加载右侧屏幕宽度外的音符
            // 垂直模式：音符从上向下移动，需要加载上方屏幕高度外的音符
            const maxVisibleTime = isHorizontal ? (WIDTH / SPEED) : (HEIGHT / SPEED);
            const loadAheadTime = maxVisibleTime + FADE_TIME + 1.0; // 提前加载时间 = 可见时间 + 淡出时间 + 缓冲

            if (timeDelta > loadAheadTime) return; // 太远的音符不渲染
            if (trackInfo.length > 0 && !trackInfo[note.track]?.enabled) return;

            const length = note.duration * SPEED;

            // 计算音符的颜色和饱和度
            let hue, lightness, saturation;

            // 判断音符是否正在被击打（跨越判定线的时刻）
            const isBeingHit = timeDelta <= 0 && timeSinceEnd < 0;
            // 判断是否为击打瞬间（刚接触判定线的前0.1秒内）- 用于控制发光
            const isHitMoment = timeDelta > -0.1 && timeDelta <= 0 && timeSinceEnd < 0;

            // 取消击打后淡出：所有音符都使用彩色渲染，透明度仅由音轨音量决定
            const trackHue = trackInfo.length > 0 && trackInfo[note.track] ? trackInfo[note.track].hue : trackHues[note.track % trackHues.length];
            const trackVolume = trackInfo.length > 0 && trackInfo[note.track] ? trackInfo[note.track].volume : 1.0;
            hue = trackHue + note.velocity * 20;
            saturation = '100%';
            lightness = isLight ? 60 : 55;
            const alpha = trackVolume * note.velocity;

            if (isHorizontal) {
                const x = hitX + timeDelta * SPEED;
                const y = midiToY(note.midi);
                if (x > WIDTH + FADE_IN_DIST) return;

                // 判断音符是否已完全通过判定线
                const isFullyPassed = timeSinceEnd >= 0;

                // 完全通过的音符渲染为灰色
                if (isFullyPassed) {
                    ctx.fillStyle = `hsla(0, 0%, ${isLight ? 75 : 35}%, ${alpha * 0.7})`;
                    ctx.shadowBlur = 0;
                    ctx.beginPath();
                    ctx.roundRect(x, y - THICKNESS / 2, length, THICKNESS, 5);
                    ctx.fill();
                }
                // 对于正在播放的长音符，需要分段渲染：已过部分灰色，未过部分彩色
                else if (isBeingHit && length > 0) {
                    // 计算判定线在音符中的位置
                    const passedLength = (-timeDelta) * SPEED; // 已经过判定线的长度
                    const remainingLength = length - passedLength; // 剩余未过的长度

                    // 渲染已过的部分（灰色）
                    if (passedLength > 0) {
                        ctx.fillStyle = `hsla(0, 0%, ${isLight ? 75 : 35}%, ${alpha * 0.7})`;
                        ctx.shadowBlur = 0; // 灰色部分不发光
                        ctx.beginPath();
                        ctx.roundRect(x, y - THICKNESS / 2, Math.min(passedLength, length), THICKNESS, 5);
                        ctx.fill();
                    }

                    // 渲染剩余的部分（彩色，在判定线右侧）
                    if (remainingLength > 0) {
                        ctx.fillStyle = `hsla(${hue}, ${saturation}, ${lightness}%, ${alpha})`;
                        // 只有开启发光效果且在击打阶段才应用shadowBlur
                        if (enableGlow && isBeingHit) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = GLOW_BLUR; }
                        ctx.beginPath();
                        ctx.roundRect(x + passedLength, y - THICKNESS / 2, remainingLength, THICKNESS, 5);
                        ctx.fill();
                    }
                } else if (timeDelta > 0) {
                    // 还未到达判定线的音符：彩色渲染
                    ctx.fillStyle = `hsla(${hue}, ${saturation}, ${lightness}%, ${alpha})`;
                    ctx.shadowBlur = 0;
                    ctx.beginPath(); ctx.roundRect(x, y - THICKNESS / 2, length, THICKNESS, 5); ctx.fill();
                }
            } else {
                const y = hitY - timeDelta * SPEED;
                const x = midiToX(note.midi);
                if (y < -FADE_IN_DIST) return;

                // 判断音符是否已完全通过判定线
                const isFullyPassed = timeSinceEnd >= 0;

                // 完全通过的音符渲染为灰色
                if (isFullyPassed) {
                    ctx.fillStyle = `hsla(0, 0%, ${isLight ? 75 : 35}%, ${alpha * 0.7})`;
                    ctx.shadowBlur = 0;
                    ctx.beginPath();
                    ctx.roundRect(x - THICKNESS / 2, y - length, THICKNESS, length, 5);
                    ctx.fill();
                }
                // 对于正在播放的长音符，需要分段渲染：已过部分灰色，未过部分彩色
                else if (isBeingHit && length > 0) {
                    // 计算判定线在音符中的位置
                    const passedLength = (-timeDelta) * SPEED; // 已经过判定线的长度
                    const remainingLength = length - passedLength; // 剩余未过的长度

                    // 渲染已过的部分（灰色，在判定线下方）
                    if (passedLength > 0) {
                        ctx.fillStyle = `hsla(0, 0%, ${isLight ? 75 : 35}%, ${alpha * 0.7})`;
                        ctx.shadowBlur = 0; // 灰色部分不发光
                        ctx.beginPath();
                        ctx.roundRect(x - THICKNESS / 2, y - passedLength, THICKNESS, passedLength, 5);
                        ctx.fill();
                    }

                    // 渲染剩余的部分（彩色，在判定线上方）
                    if (remainingLength > 0) {
                        ctx.fillStyle = `hsla(${hue}, ${saturation}, ${lightness}%, ${alpha})`;
                        // 只有开启发光效果且在击打阶段才应用shadowBlur
                        if (enableGlow && isBeingHit) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = GLOW_BLUR; }
                        ctx.beginPath();
                        ctx.roundRect(x - THICKNESS / 2, y - length, THICKNESS, remainingLength, 5);
                        ctx.fill();
                    }
                } else if (timeDelta > 0) {
                    // 还未到达判定线的音符：彩色渲染
                    ctx.fillStyle = `hsla(${hue}, ${saturation}, ${lightness}%, ${alpha})`;
                    ctx.shadowBlur = 0;
                    ctx.beginPath(); ctx.roundRect(x - THICKNESS / 2, y - length, THICKNESS, length, 5); ctx.fill();
                }
            }

            // 粒子颜色和透明度动态适配音符当前渲染状态（包括灰色淡出）
            if (isPlaying && enableParticles && timeSinceEnd < 0 && timeDelta <= 0) {
                // 检查当前帧粒子数量是否已达上限（无限制模式下跳过检查）
                if (unlimitedParticles || particles.length < maxParticlesPerFrame) {
                    // 判断音符的当前渲染状态：若已完全通过判定线，使用灰色；否则使用彩色
                    const isFullyPassed = timeSinceEnd >= 0;
                    let particleColor;
                    if (isFullyPassed) {
                        // 完全通过判定线的灰显状态
                        particleColor = `hsla(0, 0%, ${isLight ? 75 : 35}%, ${alpha * 0.7})`;
                    } else {
                        // 使用与当前音符渲染完全一致的彩色
                        particleColor = `hsla(${hue}, ${saturation}, ${lightness}%, ${alpha})`;
                    }

                    // 长音阈值改为 0.3 秒，降低概率到 0.4，每帧产生 1~2 个粒子
                    const isLongNote = note.duration > 0.3;
                    if (isLongNote && Math.random() < 0.4) {
                        let particleX, particleY;
                        if (isHorizontal) { particleX = hitX; particleY = midiToY(note.midi); }
                        else { particleX = midiToX(note.midi); particleY = hitY; }
                        const count = 1 + Math.floor(Math.random() * 2); // 1-2 个
                        createParticles(particleX, particleY, particleColor, count);
                    }
                }
            }
        });

        // 恢复默认混合模式，确保后续渲染（粒子、网格等）不受影响
        ctx.globalCompositeOperation = 'source-over';

        ctx.shadowBlur = 0;
        particles = particles.filter(p => p.life > 0);
        particles.forEach(particle => { particle.update(); particle.draw(ctx); });

        // 恢复画布变换（震动偏移）
        if (shakeAmount > 0.5) {
            ctx.restore();
        }
    }

    // ==================== 画布尺寸（跟随容器显示尺寸） ====================
    function resizeCanvas(width, height) {
        WIDTH = Math.max(320, Math.round(width));
        HEIGHT = Math.max(240, Math.round(height));
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        drawFrame(currentTime);
    }

    // 画布像素尺寸跟随其显示尺寸，避免 CSS 拉伸导致画面变形
    function getCanvasDisplaySize() {
        if (!wrapper) return getDefaultCanvasSize();
        const rect = wrapper.getBoundingClientRect();
        if (!rect.width || !rect.height) return getDefaultCanvasSize();
        return { width: rect.width, height: rect.height };
    }

    function updateCanvasSizeForCurrentMode() {
        if (document.fullscreenElement === wrapper && wrapper) {
            const rect = wrapper.getBoundingClientRect();
            resizeCanvas(rect.width, rect.height);
            return;
        }
        const displaySize = getCanvasDisplaySize();
        resizeCanvas(displaySize.width, displaySize.height);
    }

    // 容器尺寸变化（窗口缩放、面板显隐、全屏切换）时同步画布
    let canvasResizeRaf = 0;
    let canvasResizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && wrapper) {
        canvasResizeObserver = new ResizeObserver(() => {
            if (canvasResizeRaf) cancelAnimationFrame(canvasResizeRaf);
            canvasResizeRaf = requestAnimationFrame(() => {
                canvasResizeRaf = 0;
                updateCanvasSizeForCurrentMode();
            });
        });
        canvasResizeObserver.observe(wrapper);
    }

    // ==================== 全屏 ====================
    async function toggleFullscreen() {
        if (!wrapper) return;
        if (typeof window.pywebview !== 'undefined') {
            try {
                if (!window.pywebview.api || typeof window.pywebview.api.fs !== 'function') return;
                const ret = await pywebview.api.fs();
                if (ret === 'fullscreen') {
                    document.body.classList.add('pywebview-fullscreen');
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
                } else if (ret === 'windowed') {
                    document.body.classList.remove('pywebview-fullscreen');
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
                }
            } catch (e) {
                console.warn('pywebview fs error:', e);
            }
            return;
        }
        // 浏览器环境：使用 HTML5 全屏
        try {
            if (document.fullscreenElement === wrapper) {
                await document.exitFullscreen();
                wrapper.classList.remove('fullscreen');
                document.body.classList.remove('fullscreen-active');
            } else {
                await wrapper.requestFullscreen();
                wrapper.classList.add('fullscreen');
                document.body.classList.add('fullscreen-active');
            }
        } catch (err) {
            onStatus(`全屏切换失败: ${err.message}`);
        }
    }

    function handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement === wrapper;
        if (wrapper) {
            wrapper.classList.toggle('fullscreen', isFullscreen);
        }
        // 全屏状态下隐藏鼠标 / 其它视觉反馈由 CSS 依据该 class 处理
        document.body.classList.toggle('fullscreen-active', isFullscreen);
        updateCanvasSizeForCurrentMode();
        // 退出全屏后强制立即绘制白色背景，防止黑色闪烁
        requestAnimationFrame(() => drawFrame(currentTime));
    }

    // ==================== 窗口尺寸 ====================
    let resizeTimer = 0;

    function handleWindowResize() {
        updateCanvasSizeForCurrentMode();
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ windowWidth: window.innerWidth, windowHeight: window.innerHeight })
            }).catch(() => {});
        }, 500);
    }

    // ==================== 键盘 ====================
    function handleKeydown(e) {
        if (e.code === 'Space') { e.preventDefault(); if (notes.length > 0) { if (isPlaying) pausePlay(); else startPlay(); } }
        if (e.code === 'KeyR') { stopPlay(); }
        // ESC 退出 pywebview 全屏
        if (e.code === 'Escape' && typeof window.pywebview !== 'undefined' && document.body.classList.contains('pywebview-fullscreen')) {
            toggleFullscreen();
        }
    }

    // ==================== 事件注册 ====================
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('keydown', handleKeydown);
    document.body.addEventListener('dragenter', handleDragEnter);
    document.body.addEventListener('dragover', handleDragOver);
    document.body.addEventListener('dragleave', handleDragLeave);
    document.body.addEventListener('drop', handleDrop);

    // ==================== 配置保存/加载 ====================
    function saveConfig() {
        const cfg = {
            volume: settings.volume,
            speed: settings.speed,
            playbackRate: settings.playbackRate,
            hitLinePosition: settings.hitLinePosition,
            direction: settings.direction,
            particles: settings.particles,
            glow: settings.glow,
            shake: settings.shake,
            shakeIntensity: settings.shakeIntensity,
            particleLimit: settings.particleLimit,
            info: settings.info,
            velocity: settings.velocity,
            theme: settings.theme,
        };
        if (settings.canvasHeight != null) cfg.canvasHeight = settings.canvasHeight;
        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg)
        }).catch(() => {});
    }

    function loadAndApplyConfig() {
        fetch('/api/config')
            .then(r => r.json())
            .then(cfg => {
                if (cfg.theme !== undefined) settings.theme = cfg.theme;
                if (cfg.canvasHeight !== undefined) settings.canvasHeight = cfg.canvasHeight;

                if (cfg.volume !== undefined) {
                    settings.volume = cfg.volume;
                    if (masterVolume && !masterVolume.disposed) masterVolume.volume.value = cfg.volume;
                }
                if (cfg.speed !== undefined) {
                    settings.speed = cfg.speed;
                    SPEED = cfg.speed;
                }
                if (cfg.playbackRate !== undefined) {
                    settings.playbackRate = cfg.playbackRate;
                    playbackRate = cfg.playbackRate;
                    applyPlaybackRate();
                }
                if (cfg.hitLinePosition !== undefined) {
                    settings.hitLinePosition = cfg.hitLinePosition;
                    hitLinePosition = cfg.hitLinePosition;
                }
                if (cfg.direction) setDirection(cfg.direction);
                if (cfg.particles !== undefined) {
                    settings.particles = cfg.particles;
                    enableParticles = cfg.particles;
                    if (!enableParticles) particles = [];
                }
                if (cfg.glow !== undefined) {
                    settings.glow = cfg.glow;
                    enableGlow = cfg.glow;
                }
                if (cfg.shake !== undefined) {
                    settings.shake = cfg.shake;
                    enableShake = cfg.shake;
                }
                if (cfg.shakeIntensity !== undefined) {
                    settings.shakeIntensity = cfg.shakeIntensity;
                    shakeIntensity = cfg.shakeIntensity;
                }
                if (cfg.particleLimit !== undefined) {
                    settings.particleLimit = cfg.particleLimit;
                    maxParticlesPerFrame = cfg.particleLimit;
                }
                if (cfg.info !== undefined) {
                    settings.info = cfg.info;
                    targetExtraInfoAlpha = cfg.info ? 1 : 0;
                    currentExtraInfoAlpha = targetExtraInfoAlpha;
                }
                if (cfg.velocity !== undefined) {
                    settings.velocity = cfg.velocity;
                }

                onConfigLoaded(cfg);
                if (!isPlaying) drawFrame(currentTime);
            })
            .catch(() => {});
    }

    // ==================== 设置 Setter（UI -> 引擎） ====================
    function setVolume(db) {
        const value = parseFloat(db);
        if (!Number.isFinite(value)) return;
        settings.volume = value;
        if (masterVolume && !masterVolume.disposed) masterVolume.volume.value = value;
        saveConfig();
    }

    function setSpeed(speed) {
        const value = parseInt(speed, 10);
        if (!Number.isFinite(value)) return;
        settings.speed = value;
        SPEED = value;
        saveConfig();
        if (!isPlaying) drawFrame(currentTime);
    }

    function setPlaybackRate(rate) {
        const value = parseFloat(rate);
        playbackRate = Number.isFinite(value) && value > 0 ? value : 1;
        settings.playbackRate = playbackRate;
        applyPlaybackRate();
        saveConfig();
    }

    function setHitLinePosition(ratio) {
        const value = parseFloat(ratio);
        if (!Number.isFinite(value)) return;
        settings.hitLinePosition = value;
        hitLinePosition = value;
        saveConfig();
        if (!isPlaying) drawFrame(currentTime);
    }

    function setDirection(direction) {
        if (!direction) return;
        settings.direction = direction;
        flowDirection = direction;
        saveConfig();
        if (!isPlaying && typeof currentTime !== 'undefined') {
            drawFrame(currentTime);
        }
    }

    function setInfoEnabled(enabled) {
        const value = !!enabled;
        settings.info = value;
        targetExtraInfoAlpha = value ? 1 : 0;
        if (!isPlaying) animateTransition();
        saveConfig();
    }

    function setParticlesEnabled(enabled) {
        const value = !!enabled;
        settings.particles = value;
        enableParticles = value;
        if (!enableParticles) particles = [];
        saveConfig();
        if (!isPlaying) drawFrame(currentTime);
    }

    function setGlowEnabled(enabled) {
        const value = !!enabled;
        settings.glow = value;
        enableGlow = value;
        saveConfig();
        if (!isPlaying) drawFrame(currentTime);
    }

    function setShakeEnabled(enabled) {
        const value = !!enabled;
        settings.shake = value;
        enableShake = value;
        saveConfig();
        if (!isPlaying) drawFrame(currentTime);
    }

    function setShakeIntensity(intensity) {
        const value = parseFloat(intensity);
        if (!Number.isFinite(value)) return;
        settings.shakeIntensity = value;
        shakeIntensity = value;
        saveConfig();
        if (!isPlaying) drawFrame(currentTime);
    }

    // 画布显示高度（由界面拖拽调整后持久化）
    function setCanvasHeight(height) {
        const value = Math.round(parseFloat(height));
        if (!Number.isFinite(value) || value <= 0) return;
        settings.canvasHeight = value;
        saveConfig();
    }

    function setParticleLimit(limit) {
        const value = parseInt(limit, 10);
        if (!Number.isFinite(value)) return;
        if (value >= 2048) {
            unlimitedParticles = true;
            maxParticlesPerFrame = Infinity;
        } else {
            unlimitedParticles = false;
            maxParticlesPerFrame = Number.isFinite(value) && value > 0 ? value : 1024;
        }
        settings.particleLimit = value;
        saveConfig();
    }

    function setTrackEnabled(index, enabled) {
        const track = trackInfo[index];
        if (!track) return;
        track.enabled = !!enabled;
        if (!isPlaying) drawFrame(currentTime);
    }

    function setTrackVolume(index, volume) {
        const track = trackInfo[index];
        if (!track) return;
        const value = parseFloat(volume);
        if (!Number.isFinite(value)) return;
        track.volume = value;

        // 当音量设为0时，自动关闭该音轨的开关（与原 UI 行为一致）
        if (value === 0 && track.enabled) {
            track.enabled = false;
            if (!isPlaying) drawFrame(currentTime);
            // 通知 UI 同步复选框状态
            emitTracks();
        }
    }

    async function setTrackInstrument(index, instrument) {
        const track = trackInfo[index];
        if (!track) return;
        track.instrument = instrument;
        const resolvedType = getTrackResolvedInstrumentType(track);
        if (resolvedType) {
            onStatus(`加载音轨音色中...`);
            await getInstrumentInstance(resolvedType);
            onStatus(`音轨 ${trackInfo[index].name} 音色就绪`);
        }
    }

    function seek(seconds) {
        if (notes.length === 0 || gridLines.length === 0 || totalDuration <= 0) {
            updateProgressUI();
            return;
        }
        const rawSeekTime = Math.max(0, Math.min(totalDuration, parseFloat(seconds) || 0));
        const measureLines = gridLines.filter(line => line.isMeasure);
        if (measureLines.length === 0) return;
        const snappedTime = measureLines.reduce((prev, curr) => (Math.abs(curr.time - rawSeekTime) < Math.abs(prev.time - rawSeekTime) ? curr : prev)).time;
        currentTime = snappedTime;
        if (isPlaying) scheduleTransportFrom(currentTime);
        else drawFrame(currentTime);
        updateProgressUI();
    }

    function setLoop(enabled) {
        isLoopEnabled = !!enabled;
        if (isPlaying && notes.length > 0) scheduleTransportFrom(currentTime);
    }

    function stop() { stopPlay(false); }

    // 主题变化后重绘；可选传入 themeMode，传入时会同步到 /api/config（与原主题切换写注册表的时机一致）
    function refreshTheme(themeMode) {
        if (typeof themeMode === 'string' && themeMode) {
            settings.theme = themeMode;
            saveConfig();
        }
        requestAnimationFrame(() => drawFrame(currentTime));
    }

    // 音色下拉选项（value 语义与 setTrackInstrument 完全一致）
    function getInstrumentOptions() {
        const options = [{ value: 'midi_auto', label: '自动（MIDI）' }];
        const sampleOptions = [
            { value: 'piano', label: '钢琴' },
            { value: 'violin', label: '小提琴' },
            { value: 'viola', label: '中提琴' },
            { value: 'cello', label: '大提琴' },
            { value: 'piccolo', label: '短笛' },
            { value: 'flute', label: '长笛' },
            { value: 'acoustic_guitar', label: '吉他' },
            { value: 'music_box', label: '八音盒' },
            { value: 'shamisen', label: '三味线' },
            { value: 'voice', label: '人声' }
        ];
        const synthOptions = [
            { value: 'default', label: '正弦合成器' },
            { value: 'fm', label: 'FM 电钢琴' },
            { value: 'am', label: 'AM 复古' },
            { value: 'fat', label: '胖锯齿波' }
        ];
        sampleOptions.forEach(opt => options.push({ value: opt.value, label: `采样音色 · ${opt.label}` }));
        synthOptions.forEach(opt => options.push({ value: opt.value, label: `合成器音色 · ${opt.label}` }));
        GM_PROGRAM_NAMES.forEach((name, idx) => options.push({ value: `gm:${idx}`, label: `GM ${idx + 1}: ${name}` }));
        return options;
    }

    function getState() {
        return {
            settings: Object.assign({}, settings),
            isPlaying,
            isLoopEnabled,
            currentTime,
            totalDuration,
            loadedFileName,
            noteCount: notes.length,
            gridLineCount: gridLines.length,
            trackCount: trackInfo.length,
            midiRange: window.midiRange ? Object.assign({}, window.midiRange) : null,
            midiMeta: midiMeta,
            canvas: { width: WIDTH, height: HEIGHT },
            effects: {
                maxParticlesPerFrame,
                unlimitedParticles,
                activeParticles: particles.length
            },
            instrumentTypes: Object.keys(instrumentPool)
        };
    }

    // ==================== 销毁 ====================
    function destroy() {
        isPlaying = false;
        try {
            Tone.Transport.loop = false;
            Tone.Transport.stop();
            Tone.Transport.cancel();
        } catch (err) { /* Tone 可能已不可用，忽略 */ }

        if (renderRaf) { cancelAnimationFrame(renderRaf); renderRaf = 0; }
        if (transitionRaf) { cancelAnimationFrame(transitionRaf); transitionRaf = 0; }
        if (canvasResizeRaf) { cancelAnimationFrame(canvasResizeRaf); canvasResizeRaf = 0; }
        if (hideLoadingTimer) { clearTimeout(hideLoadingTimer); hideLoadingTimer = 0; }
        if (resizeTimer) { clearTimeout(resizeTimer); resizeTimer = 0; }
        if (canvasResizeObserver) { canvasResizeObserver.disconnect(); canvasResizeObserver = null; }

        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('resize', handleWindowResize);
        document.body.removeEventListener('dragenter', handleDragEnter);
        document.body.removeEventListener('dragover', handleDragOver);
        document.body.removeEventListener('dragleave', handleDragLeave);
        document.body.removeEventListener('drop', handleDrop);

        // 由本实例添加的 body 级 class 一并清理
        document.body.classList.remove('drag-over');
        document.body.classList.remove('pywebview-fullscreen');
        document.body.classList.remove('fullscreen-active');
        if (wrapper) wrapper.classList.remove('fullscreen');

        // 释放本实例创建的音频节点
        const disposed = new Set();
        Object.keys(instrumentPool).forEach(type => {
            const inst = instrumentPool[type];
            if (inst && typeof inst.dispose === 'function' && !disposed.has(inst)) {
                disposed.add(inst);
                try { inst.dispose(); } catch (err) { /* 忽略重复释放 */ }
            }
        });
        try { reverb.dispose(); } catch (err) { /* 忽略 */ }
        try { masterVolume.dispose(); } catch (err) { /* 忽略 */ }

        notes = [];
        gridLines = [];
        trackInfo = [];
        particles = [];
        midiMeta = null;
    }

    // ==================== 对外 API ====================
    const api = {
        loadFile,
        setVolume,
        setSpeed,
        setPlaybackRate,
        setHitLinePosition,
        setDirection,
        setInfoEnabled,
        setParticlesEnabled,
        setGlowEnabled,
        setShakeEnabled,
        setShakeIntensity,
        setParticleLimit,
        setCanvasHeight,
        setTrackEnabled,
        setTrackVolume,
        setTrackInstrument,
        togglePlay,
        stop,
        seek,
        setLoop,
        toggleFullscreen,
        refreshTheme,
        getInstrumentOptions,
        getState,
        destroy
    };

    // ==================== 初始 ====================
    updateCanvasSizeForCurrentMode();
    loadAndApplyConfig();
    drawFrame(0);

    return api;
}
