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

    // ==================== 加载进度控制 ====================
    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            updateLoadingProgress(0);
        }
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    function updateLoadingProgress(percent) {
        if (loadingProgressBar && loadingPercentage) {
            const roundedPercent = Math.round(percent);
            loadingProgressBar.style.width = `${percent}%`;
            loadingPercentage.textContent = `${roundedPercent}%`;
        }
    }

    // ==================== DOM ====================
    const canvas = document.getElementById('canvas');
    const canvasWrapper = document.getElementById('canvasWrapper');
    const canvasFsBtn = document.getElementById('canvasFsBtn');
    const ctx = canvas.getContext('2d');
    const fileInput = document.getElementById('fileInput');
    const playBtn = document.getElementById('playBtn');
    const loopBtn = document.getElementById('loopBtn');
    const playbackRateSlider = document.getElementById('playbackRateSlider');
    const playbackRateValue = document.getElementById('playbackRateValue');
    const statusEl = document.getElementById('status');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    const loadingPercentage = document.getElementById('loadingPercentage');
    const particleToggle = document.getElementById('particleToggle');
    const glowToggle = document.getElementById('glowToggle');
    const particleLimitSlider = document.getElementById('particleLimitSlider');
    const particleLimitValue = document.getElementById('particleLimitValue');
    const unlimitedParticlesToggle = document.getElementById('unlimitedParticlesToggle');
    const shakeToggle = document.getElementById('shakeToggle');
    const shakeIntensitySlider = document.getElementById('shakeIntensitySlider');
    const shakeIntensityValue = document.getElementById('shakeIntensityValue');

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    function isLightTheme() {
        return true; // 始终浅色模式
    }

    function resizeCanvas(width, height) {
        WIDTH = Math.max(320, Math.round(width));
        HEIGHT = Math.max(240, Math.round(height));
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        if (!isPlaying) drawFrame(currentTime);
    }

    function updateCanvasSizeForCurrentMode() {
        if (document.fullscreenElement === canvasWrapper && canvasWrapper) {
            const rect = canvasWrapper.getBoundingClientRect();
            resizeCanvas(rect.width, rect.height);
            return;
        }
        const defaultSize = getDefaultCanvasSize();
        resizeCanvas(defaultSize.width, defaultSize.height);
    }

    async function toggleCanvasFullscreen() {
        if (!canvasWrapper) return;
        if (typeof window.pywebview !== 'undefined') {
            pywebview.api.fs().then((ret) => {
                if (ret === 'fullscreen') {
                    document.body.classList.add('pywebview-fullscreen');
                    if (canvasFsBtn) canvasFsBtn.style.display = 'none';
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
                } else if (ret === 'windowed') {
                    document.body.classList.remove('pywebview-fullscreen');
                    if (canvasFsBtn) canvasFsBtn.style.display = 'block';
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
                }
            }).catch((e) => {
                console.warn('pywebview fs error:', e);
            });
            return;
        }
        // 浏览器环境：使用 HTML5 全屏
        try {
            if (document.fullscreenElement === canvasWrapper) {
                await document.exitFullscreen();
            } else {
                await canvasWrapper.requestFullscreen();
            }
        } catch (err) {
            statusEl.textContent = `全屏切换失败: ${err.message}`;
        }
    }

    if (canvasFsBtn) {
        canvasFsBtn.addEventListener('click', toggleCanvasFullscreen);
    }

    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = document.fullscreenElement === canvasWrapper;
        if (canvasWrapper) {
            canvasWrapper.classList.toggle('fullscreen', isFullscreen);
        }
        if (canvasFsBtn) {
            canvasFsBtn.style.display = isFullscreen ? 'none' : 'block';
        }
        // 强制隐藏/恢复鼠标
        document.body.style.cursor = isFullscreen ? 'none' : '';
        if (isFullscreen) {
            // 每 100ms 强制设置一次光标，防止被覆盖
            const keepHidden = () => {
                if (!document.fullscreenElement) {
                    document.body.style.cursor = '';
                    return;
                }
                document.body.style.cursor = 'none';
                requestAnimationFrame(keepHidden);
            };
            requestAnimationFrame(keepHidden);
        }
        updateCanvasSizeForCurrentMode();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        updateCanvasSizeForCurrentMode();
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ windowWidth: window.innerWidth, windowHeight: window.innerHeight })
            }).catch(() => {});
        }, 500);
    });

    // ==================== 瀑布流方向控制 ====================
    let flowDirection = 'horizontal';
    const directionButtons = document.querySelectorAll('.direction-btn');

    function setFlowDirection(direction) {
        flowDirection = direction;
        directionButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.direction === direction);
        });
        saveConfig();
        if (!isPlaying && typeof currentTime !== 'undefined') {
            drawFrame(currentTime);
        }
    }

    if (directionButtons.length > 0) {
        directionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const nextDirection = btn.dataset.direction;
                if (nextDirection) setFlowDirection(nextDirection);
            });
        });
        directionButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.direction === flowDirection);
        });
    }

    function midiToX(midi) {
        const range = window.midiRange || { min: 48, max: 84 };
        const availableWidth = WIDTH - 2 * MARGIN;
        const normalized = (midi - range.min) / (range.max - range.min);
        return MARGIN + normalized * availableWidth;
    }

    // ==================== 状态 ====================
    let notes = [];
    let gridLines = [];
    let isPlaying = false;
    let currentTime = 0;
    let totalDuration = 0;
    let isDraggingProgress = false;
    let isLoopEnabled = false;

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
        updateMidiInfo();
    }

    function updateMidiInfo() {
        const midiInfoEl = document.getElementById('midiInfo');
        if (!midiMeta) {
            midiInfoEl.innerHTML = '<span class="midi-info-empty">加载 MIDI 文件后显示文件信息</span>';
            return;
        }
        midiInfoEl.innerHTML = `
            <svg class="midi-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <span class="midi-filename">${midiMeta.fileName}</span>
            <span class="midi-divider">|</span>
            <span class="midi-meta">${midiMeta.timeSig}</span>
            <span class="midi-divider">|</span>
            <span class="midi-meta">${midiMeta.bpm} BPM</span>
            <span class="midi-divider">|</span>
            <span class="midi-meta">${midiMeta.keySig} 大调</span>
            <span class="midi-divider">|</span>
            <span class="midi-meta">${midiMeta.totalNotes} 个音符</span>
        `;
    }

    function getTrackAutoLabel(track) {
        if (track.isPercussion) return '自动（MIDI）: Standard Drum Kit';
        if (typeof track.gmProgram === 'number' && GM_PROGRAM_NAMES[track.gmProgram]) return `自动（MIDI）: GM ${track.gmProgram + 1} ${GM_PROGRAM_NAMES[track.gmProgram]}`;
        return '自动（MIDI）: 默认音色';
    }

    function buildTrackInstrumentOptions(track) {
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
        const autoHtml = `<option value="midi_auto">${getTrackAutoLabel(track)}</option>`;
        const sampleHtml = sampleOptions.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
        const synthHtml = synthOptions.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
        const gmItems = GM_PROGRAM_NAMES.map((name, idx) => `<option value="gm:${idx}">GM ${idx + 1}: ${name}</option>`).join('');
        const gmHtml = `<optgroup label="GM 标准音色">${gmItems}</optgroup>`;
        return `${autoHtml}<optgroup label="采样音色（需加载）">${sampleHtml}</optgroup><optgroup label="合成器音色">${synthHtml}</optgroup>${gmHtml}`;
    }

    function initTrackPanel() {
        const trackPanel = document.getElementById('trackPanel');
        const trackList = document.getElementById('trackList');
        const oldToolbar = trackPanel.querySelector('.track-instrument-toolbar');
        if (oldToolbar) oldToolbar.remove();

        if (trackInfo.length === 0) {
            trackList.innerHTML = '<p class="track-empty">加载 MIDI 文件后显示音轨信息</p>';
            return;
        }
        trackList.innerHTML = '';

        trackInfo.forEach((track, index) => {
            const trackEl = document.createElement('div');
            trackEl.className = 'track-item';
            trackEl.innerHTML = `
                <label class="track-toggle">
                    <input type="checkbox" data-track="${index}" ${track.enabled ? 'checked' : ''}>
                    <span class="track-checkbox" style="--track-hue: ${track.hue}"></span>
                </label>
                <span class="track-name" style="--track-hue: ${track.hue}">${track.name}</span>
                <span class="track-instrument-name" style="margin-left:4px;color:#888;font-size:13px;">${track.instrumentName ? '（' + track.instrumentName + '）' : ''}</span>
                <span class="track-sep">-</span>
                <span class="track-notes">${track.noteCount}个</span>
                <span class="track-sep">-</span>
                <span class="track-range">${track.noteRange}</span>
                <select class="track-instrument-select" data-track="${index}">
                    ${buildTrackInstrumentOptions(track)}
                </select>
                <span class="track-sep">-</span>
                <div class="track-volume-control">
                    <input type="range" class="track-volume-slider" data-track="${index}" 
                        min="0" max="2" step="0.05" value="${track.volume}" 
                        style="--track-hue: ${track.hue}" title="调整音轨音量">
                    <span class="track-volume-value" id="volumeValue_${index}">${Math.round(track.volume * 100)}%</span>
                    ${track.cc7Events.length > 0 ? `<span class="cc7-indicator" title="MIDI CC7事件: ${track.cc7Events.map(e => e.percent + '%').join(', ')}">🎚️ ${track.cc7Events.length}个</span>` : ''}
                </div>
            `;
            const instSelect = trackEl.querySelector('.track-instrument-select');
            instSelect.value = track.instrument;
            instSelect.addEventListener('change', async (e) => {
                const trackIndex = parseInt(e.target.dataset.track);
                const selectedType = e.target.value;
                trackInfo[trackIndex].instrument = selectedType;
                const resolvedType = getTrackResolvedInstrumentType(trackInfo[trackIndex]);
                if (resolvedType) {
                    statusEl.textContent = `加载音轨音色中...`;
                    await getInstrumentInstance(resolvedType);
                    statusEl.textContent = `音轨 ${trackInfo[trackIndex].name} 音色就绪`;
                }
            });
            const checkbox = trackEl.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                const trackIndex = parseInt(e.target.dataset.track);
                trackInfo[trackIndex].enabled = e.target.checked;
                if (!isPlaying) drawFrame(currentTime);
            });
            const volumeSlider = trackEl.querySelector('.track-volume-slider');
            const volumeValue = trackEl.querySelector('.track-volume-value');
            
            volumeSlider.addEventListener('input', (e) => {
                const trackIndex = parseInt(e.target.dataset.track);
                const newVolume = parseFloat(e.target.value);
                trackInfo[trackIndex].volume = newVolume;
                
                // 更新显示的百分比
                if (volumeValue) {
                    volumeValue.textContent = Math.round(newVolume * 100) + '%';
                }
                
                // 当音量设为0时，自动关闭该音轨的开关按钮
                if (newVolume === 0) {
                    const checkbox = trackEl.querySelector('input[type="checkbox"]');
                    if (checkbox && checkbox.checked) {
                        checkbox.checked = false;
                        trackInfo[trackIndex].enabled = false;
                        if (!isPlaying) drawFrame(currentTime);
                    }
                }
            });
            trackList.appendChild(trackEl);
        });
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
        initTrackPanel();
    }

    // ==================== 小节线 ====================
    const infoToggle = document.getElementById('infoToggle');
    infoToggle.addEventListener('change', (e) => {
        targetExtraInfoAlpha = e.target.checked ? 1 : 0;
        if (!isPlaying) animateTransition();
        saveConfig();
    });
    function animateTransition() {
        if (Math.abs(currentExtraInfoAlpha - targetExtraInfoAlpha) > 0.01) {
            drawFrame(currentTime);
            requestAnimationFrame(animateTransition);
        } else {
            currentExtraInfoAlpha = targetExtraInfoAlpha;
            drawFrame(currentTime);
        }
    }
    let targetExtraInfoAlpha = 1;
    let currentExtraInfoAlpha = 1;
    const FADE_SPEED = 0.05;

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
            statusEl.textContent = `正在加载 MIDI 音库 ${i + 1}/${loadList.length}...`;
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
                statusEl.textContent = `正在加载 GM 音色: ${gmName}...`;
                inst = new Tone.Sampler({ urls: GM_SPARSE_SAMPLE_URLS, release: 1.1, baseUrl: `${GM_SOUNDFONT_BASE_URL}${gmId}-mp3/`, onload: () => { statusEl.textContent = `GM 音色已就绪: ${gmName}`; inst.volume.value = 6; } });
            }
        } else if (type === 'fm') inst = new Tone.PolySynth(Tone.FMSynth, { maxPolyphony: currentMaxPolyphony });
        else if (type === 'am') inst = new Tone.PolySynth(Tone.AMSynth, { maxPolyphony: currentMaxPolyphony });
        else if (type === 'fat') inst = new Tone.PolySynth(Tone.Synth, { maxPolyphony: currentMaxPolyphony, oscillator: { type: "fatsawtooth" } });
        else if (type === 'piano') {
            statusEl.textContent = '正在加载 钢琴 采样...';
            inst = new Tone.Sampler({
                urls: { "A0": "A0.mp3", "C1": "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3", "A1": "A1.mp3", "C2": "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3", "A2": "A2.mp3", "C3": "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", "A3": "A3.mp3", "C4": "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3", "A4": "A4.mp3", "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", "A5": "A5.mp3", "C6": "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3", "A6": "A6.mp3", "C7": "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3", "A7": "A7.mp3", "C8": "C8.mp3" },
                release: 1.2, baseUrl: LOCAL_SF + "salamander/",
                onload: () => { statusEl.textContent = '钢琴音色就绪 (Salamander 三角钢琴)'; inst.connect(reverb); inst.volume.value = 3; }
            });
        } else if (type in SAMPLER_CONFIGS) {
            const config = SAMPLER_CONFIGS[type];
            statusEl.textContent = `正在加载 ${config.name} 采样...`;
            inst = new Tone.Sampler({
                urls: { "A0": "A0.mp3", "B0": "B0.mp3", "C1": "C1.mp3", "D1": "D1.mp3", "E1": "E1.mp3", "F1": "F1.mp3", "G1": "G1.mp3", "A1": "A1.mp3", "B1": "B1.mp3", "C2": "C2.mp3", "D2": "D2.mp3", "E2": "E2.mp3", "F2": "F2.mp3", "G2": "G2.mp3", "A2": "A2.mp3", "B2": "B2.mp3", "C3": "C3.mp3", "D3": "D3.mp3", "E3": "E3.mp3", "F3": "F3.mp3", "G3": "G3.mp3", "A3": "A3.mp3", "B3": "B3.mp3", "C4": "C4.mp3", "D4": "D4.mp3", "E4": "E4.mp3", "F4": "F4.mp3", "G4": "G4.mp3", "A4": "A4.mp3", "B4": "B4.mp3", "C5": "C5.mp3", "D5": "D5.mp3", "E5": "E5.mp3", "F5": "F5.mp3", "G5": "G5.mp3", "A5": "A5.mp3", "B5": "B5.mp3", "C6": "C6.mp3", "D6": "D6.mp3", "E6": "E6.mp3", "F6": "F6.mp3", "G6": "G6.mp3", "A6": "A6.mp3", "B6": "B6.mp3", "C7": "C7.mp3", "D7": "D7.mp3", "E7": "E7.mp3", "F7": "F7.mp3", "G7": "G7.mp3", "A7": "A7.mp3", "B7": "B7.mp3", "C8": "C8.mp3", "G#1": "Ab1.mp3", "A#0": "Bb0.mp3", "C#1": "Db1.mp3", "D#1": "Eb1.mp3", "F#1": "Gb1.mp3", "G#2": "Ab2.mp3", "A#1": "Bb1.mp3", "C#2": "Db2.mp3", "D#2": "Eb2.mp3", "F#2": "Gb2.mp3", "G#3": "Ab3.mp3", "A#2": "Bb2.mp3", "C#3": "Db3.mp3", "D#3": "Eb3.mp3", "F#3": "Gb3.mp3", "G#4": "Ab4.mp3", "A#3": "Bb3.mp3", "C#4": "Db4.mp3", "D#4": "Eb4.mp3", "F#4": "Gb4.mp3", "G#5": "Ab5.mp3", "A#4": "Bb4.mp3", "C#5": "Db5.mp3", "D#5": "Eb5.mp3", "F#5": "Gb5.mp3", "G#6": "Ab6.mp3", "A#5": "Bb5.mp3", "C#6": "Db6.mp3", "D#6": "Eb6.mp3", "F#6": "Gb6.mp3", "G#7": "Ab7.mp3", "A#6": "Bb6.mp3", "C#7": "Db7.mp3", "D#7": "Eb7.mp3", "F#7": "Gb7.mp3", "A#7": "Bb7" },
                release: 1.2, baseUrl: config.baseUrl,
                onload: () => { statusEl.textContent = `${config.name} 音色就绪`; inst.connect(reverb); inst.volume.value = config.enhance; }
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

    function applyPlaybackRate() {
        if (playbackRateValue) {
            const rateText = Number.isInteger(playbackRate) ? playbackRate.toFixed(1) : playbackRate.toString();
            playbackRateValue.textContent = `×${rateText}`;
        }
        if (isPlaying && notes.length > 0) scheduleTransportFrom(currentTime);
    }

    if (playbackRateSlider) {
        const initialRate = parseFloat(playbackRateSlider.value);
        playbackRate = Number.isFinite(initialRate) && initialRate > 0 ? initialRate : 1;
        playbackRateSlider.addEventListener('input', (e) => { const rate = parseFloat(e.target.value); playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1; applyPlaybackRate(); saveConfig(); });
        playbackRateSlider.addEventListener('change', () => { statusEl.textContent = `播放速度已设置为 ×${playbackRate}`; });
    }
    applyPlaybackRate();
    updateLoopButtonUI();

    if (loopBtn) {
        loopBtn.addEventListener('click', () => { isLoopEnabled = !isLoopEnabled; updateLoopButtonUI(); if (isPlaying && notes.length > 0) scheduleTransportFrom(currentTime); });
    }

    // ==================== 音量控制 ====================
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    function updateVolume() {
        const dbValue = parseFloat(volumeSlider.value);
        if (masterVolume && !masterVolume.disposed) masterVolume.volume.value = dbValue;
        volumeValue.textContent = dbValue + ' dB';
    }
    volumeSlider.addEventListener('input', () => { updateVolume(); saveConfig(); });
    updateVolume();

    // ==================== 速度控制 ====================
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    speedSlider.addEventListener('input', () => { SPEED = parseInt(speedSlider.value); speedValue.textContent = SPEED; saveConfig(); });

    // ==================== 判定线位置控制 ====================
    const hitLinePositionSlider = document.getElementById('hitLinePositionSlider');
    const hitLinePositionValue = document.getElementById('hitLinePositionValue');
    hitLinePositionSlider.addEventListener('input', () => {
        hitLinePosition = parseFloat(hitLinePositionSlider.value);
        hitLinePositionValue.textContent = Math.round(hitLinePosition * 100) + '%';
        saveConfig();
    });

    // ==================== 特效开关事件监听器 ====================
    if (particleToggle) {
        particleToggle.addEventListener('change', (e) => {
            enableParticles = e.target.checked;
            if (!enableParticles) particles = [];
            saveConfig();
        });
    }

    if (glowToggle) {
        glowToggle.addEventListener('change', (e) => {
            enableGlow = e.target.checked;
            saveConfig();
        });
    }

    // ==================== 屏幕震动控制 ====================
    if (shakeToggle) {
        shakeToggle.addEventListener('change', (e) => {
            enableShake = e.target.checked;
            saveConfig();
        });
    }

    if (shakeIntensitySlider) {
        shakeIntensitySlider.addEventListener('input', (e) => {
            shakeIntensity = parseFloat(e.target.value);
            shakeIntensityValue.textContent = shakeIntensity;
            saveConfig();
        });
    }

    if (particleLimitSlider) {
        particleLimitSlider.addEventListener('input', (e) => {
            const limit = parseInt(e.target.value);
            if (limit >= 2048) {
                unlimitedParticles = true;
                maxParticlesPerFrame = Infinity;
                particleLimitValue.textContent = '∞';
                if (unlimitedParticlesToggle) unlimitedParticlesToggle.checked = true;
            } else {
                unlimitedParticles = false;
                maxParticlesPerFrame = Number.isFinite(limit) && limit > 0 ? limit : 1024;
                particleLimitValue.textContent = maxParticlesPerFrame;
                if (unlimitedParticlesToggle) unlimitedParticlesToggle.checked = false;
            }
            saveConfig();
        });
    }

    if (unlimitedParticlesToggle) {
        unlimitedParticlesToggle.addEventListener('change', (e) => {
            unlimitedParticles = e.target.checked;
            if (unlimitedParticles) {
                maxParticlesPerFrame = Infinity;
                particleLimitValue.textContent = '∞';
                particleLimitSlider.value = 2176; // 将滑块推到最右
            } else {
                maxParticlesPerFrame = 1024;
                particleLimitValue.textContent = maxParticlesPerFrame;
                particleLimitSlider.value = 1024; // 恢复到默认值
            }
        });
    }

    // ==================== 小节线显示设置 ====================
    let showMeasureLines = true;
    let measureLineAlpha = 0.3;

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

    // ==================== 进度条控制 ====================
    const progressSlider = document.getElementById('progressSlider');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');

    function getEffectivePlaybackRate() { return Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1; }
    function toTransportTime(songTime) { return songTime / getEffectivePlaybackRate(); }
    function toSongTime(transportTime) { return transportTime * getEffectivePlaybackRate(); }
    function formatTime(seconds) { const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${mins}:${secs.toString().padStart(2, '0')}`; }

    function updateProgressUI() {
        if (totalDuration > 0) {
            const progress = (currentTime / totalDuration) * 100;
            if (!isDraggingProgress) progressSlider.value = progress;
            currentTimeEl.textContent = formatTime(currentTime);
            totalTimeEl.textContent = formatTime(totalDuration);
        } else {
            if (!isDraggingProgress) progressSlider.value = 0;
            currentTimeEl.textContent = '0:00';
            totalTimeEl.textContent = '0:00';
        }
    }

    function updateLoopButtonUI() {
        if (!loopBtn) return;
        loopBtn.classList.toggle('active', isLoopEnabled);
        loopBtn.setAttribute('aria-pressed', isLoopEnabled ? 'true' : 'false');
        loopBtn.title = isLoopEnabled ? '循环播放：开启' : '循环播放：关闭';
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

    progressSlider.addEventListener('mousedown', () => isDraggingProgress = true);
    progressSlider.addEventListener('touchstart', () => isDraggingProgress = true, { passive: true });

    function handleSeekEnd() {
        if (notes.length > 0 && gridLines.length > 0) {
            const percent = parseFloat(progressSlider.value);
            const rawSeekTime = (percent / 100) * totalDuration;
            let snappedTime = gridLines.filter(line => line.isMeasure).reduce((prev, curr) => (Math.abs(curr.time - rawSeekTime) < Math.abs(prev.time - rawSeekTime) ? curr : prev)).time;
            currentTime = snappedTime;
            progressSlider.value = (currentTime / totalDuration) * 100;
            if (isPlaying) scheduleTransportFrom(currentTime);
            else drawFrame(currentTime);
        }
        isDraggingProgress = false;
        updateProgressUI();
    }
    progressSlider.addEventListener('mouseup', handleSeekEnd);
    progressSlider.addEventListener('touchend', handleSeekEnd);

    // ==================== 工具：停止并清理 ====================
    function resetPlaybackState(resetToStart = true) {
        isPlaying = false;
        Tone.Transport.loop = false;
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (resetToStart) currentTime = 0;
        particles = [];
        document.getElementById('playIcon').innerHTML = '<polygon points="5,3 19,12 5,21"/>';
        updateProgressUI();
    }

    function clearLoadedMidiData() {
        notes = []; gridLines = []; totalDuration = 0; currentTime = 0; playBtn.disabled = true;
        trackInfo = []; midiMeta = null; updateMidiInfo(); initTrackPanel(); updateProgressUI(); drawFrame(0);
    }

    function stopAndClear() { resetPlaybackState(true); clearLoadedMidiData(); }

    // ==================== 加载 MIDI ====================
    async function loadMidiFile(file) {
        if (!file) return;
        stopAndClear();
        showLoading();
        statusEl.textContent = '正在加载...';
        
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
            playBtn.disabled = false;
            statusEl.textContent = `已加载: ${file.name} (${notes.length} 个音符)`;
            totalDuration = notes[notes.length - 1].time + notes[notes.length - 1].duration;
            updateProgressUI();
            drawFrame(0);
            
            updateLoadingProgress(100);
            setTimeout(() => hideLoading(), 300);
        } catch (err) { 
            console.error('加载失败:', err); 
            statusEl.textContent = '加载失败: ' + err.message;
            hideLoading();
        }
    }

    fileInput.addEventListener('change', (e) => {
        loadMidiFile(e.target.files[0]);
    });

    // ==================== 拖放加载 MIDI ====================
    let dragCounter = 0;

    document.body.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        if (dragCounter === 1) {
            document.body.classList.add('drag-over');
        }
    });

    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    document.body.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            document.body.classList.remove('drag-over');
        }
    });

    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        document.body.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const name = file.name.toLowerCase();
            if (name.endsWith('.mid') || name.endsWith('.midi')) {
                loadMidiFile(file);
            } else {
                statusEl.textContent = '不支持的文件格式，请拖入 .mid 或 .midi 文件';
            }
        }
    });

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
                        const trackHue = trackInfo.length > 0 && trackInfo[note.track] ? trackInfo[note.track].hue : trackHues[note.track % trackHues.length];
                        const trackVolume = trackInfo.length > 0 && trackInfo[note.track] ? trackInfo[note.track].volume : 1.0;
                        
                        // 粒子颜色：固定饱和度和亮度，音量控制透明度
                        const particleColor = `hsla(${trackHue}, 100%, 60%, ${trackVolume})`;
                        
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

    // ==================== 播放控制（正确版本，基于 Tone.Transport） ====================
    async function startPlay() {
        if (notes.length === 0) return;
        await Tone.start();
        applyPlaybackRate();
        isPlaying = true;
        document.getElementById('playIcon').innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        statusEl.textContent = '播放中...';
        const startOffset = currentTime;
        scheduleTransportFrom(startOffset);
        currentTime = startOffset;
        requestAnimationFrame(renderLoop);
    }

    function pausePlay() {
        isPlaying = false;
        Tone.Transport.pause();
        document.getElementById('playIcon').innerHTML = '<polygon points="5,3 19,12 5,21"/>';
        statusEl.textContent = '已暂停';
    }

    function stopPlay(isEnd = false) {
        resetPlaybackState(true);
        statusEl.textContent = isEnd ? '播放完毕' : '已停止';
        if (notes.length > 0) drawFrame(0);
    }

    playBtn.addEventListener('click', () => { if (isPlaying) pausePlay(); else startPlay(); });

    // ==================== 渲染 ====================
    function renderLoop() {
        if (!isPlaying) return;
        currentTime = Math.min(totalDuration, toSongTime(Tone.Transport.seconds));
        updateProgressUI();
        drawFrame(currentTime);
        requestAnimationFrame(renderLoop);
    }

    function midiToY(midi) {
        const range = window.midiRange || { min: 48, max: 84 };
        const availableHeight = HEIGHT - 2 * MARGIN;
        const normalized = (midi - range.min) / (range.max - range.min);
        return MARGIN + (1 - normalized) * availableHeight;
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
            shakeAmount = Math.min(Math.pow(hitMoment, 1.4) * 0.25, shakeIntensity);
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

            // ========= 长音持续粒子效果（修复版 + 数量限制） =========
            // 关键修复：只有正在播放的音符（timeSinceEnd < 0）才会产生粒子，灰色音符不会产生
            if (isPlaying && enableParticles && timeSinceEnd < 0 && timeDelta <= 0) {
                // 检查当前帧粒子数量是否已达上限（无限制模式下跳过检查）
                if (unlimitedParticles || particles.length < maxParticlesPerFrame) {
                    const trackHue = trackInfo.length > 0 && trackInfo[note.track] ? trackInfo[note.track].hue : trackHues[note.track % trackHues.length];
                    const trackVolume = trackInfo.length > 0 && trackInfo[note.track] ? trackInfo[note.track].volume : 1.0;
                    
                    // 长音持续粒子颜色：固定饱和度和亮度，音量控制透明度
                    const particleColor = `hsla(${trackHue}, 100%, 60%, ${trackVolume})`;
                    
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

    // ==================== 键盘 ====================
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); if (notes.length > 0) { if (isPlaying) pausePlay(); else startPlay(); } }
        if (e.code === 'KeyR') { stopPlay(); }
        // ESC 退出 pywebview 全屏
        if (e.code === 'Escape' && typeof window.pywebview !== 'undefined' && document.body.classList.contains('pywebview-fullscreen')) {
            toggleCanvasFullscreen();
        }
    });

    // ==================== 配置保存/加载 ====================
    function saveConfig() {
        const cfg = {
            volume: parseFloat(volumeSlider?.value ?? -6),
            speed: parseInt(speedSlider?.value ?? 256),
            playbackRate: parseFloat(playbackRateSlider?.value ?? 1),
            hitLinePosition: parseFloat(hitLinePositionSlider?.value ?? 0.5),
            direction: flowDirection,
            particles: particleToggle?.checked ?? true,
            glow: glowToggle?.checked ?? true,
            shake: shakeToggle?.checked ?? true,
            shakeIntensity: parseFloat(shakeIntensitySlider?.value ?? 4),
            particleLimit: parseInt(particleLimitSlider?.value ?? 1024),
            info: infoToggle?.checked ?? true,
        };
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
                if (cfg.volume !== undefined && volumeSlider) {
                    volumeSlider.value = cfg.volume;
                    updateVolume();
                }
                if (cfg.speed !== undefined && speedSlider) {
                    speedSlider.value = cfg.speed;
                    SPEED = cfg.speed;
                    speedValue.textContent = cfg.speed;
                }
                if (cfg.playbackRate !== undefined && playbackRateSlider) {
                    playbackRateSlider.value = cfg.playbackRate;
                    playbackRate = cfg.playbackRate;
                    applyPlaybackRate();
                }
                if (cfg.hitLinePosition !== undefined && hitLinePositionSlider) {
                    hitLinePositionSlider.value = cfg.hitLinePosition;
                    hitLinePosition = cfg.hitLinePosition;
                    hitLinePositionValue.textContent = Math.round(cfg.hitLinePosition * 100) + '%';
                }
                if (cfg.direction) setFlowDirection(cfg.direction);
                if (cfg.particles !== undefined && particleToggle) {
                    particleToggle.checked = cfg.particles;
                    enableParticles = cfg.particles;
                    if (!enableParticles) particles = [];
                }
                if (cfg.glow !== undefined && glowToggle) {
                    glowToggle.checked = cfg.glow;
                    enableGlow = cfg.glow;
                }
                if (cfg.shake !== undefined && shakeToggle) {
                    shakeToggle.checked = cfg.shake;
                    enableShake = cfg.shake;
                }
                if (cfg.shakeIntensity !== undefined && shakeIntensitySlider) {
                    shakeIntensitySlider.value = cfg.shakeIntensity;
                    shakeIntensity = cfg.shakeIntensity;
                    shakeIntensityValue.textContent = cfg.shakeIntensity;
                }
                if (cfg.particleLimit !== undefined && particleLimitSlider) {
                    particleLimitSlider.value = cfg.particleLimit;
                    maxParticlesPerFrame = cfg.particleLimit;
                    particleLimitValue.textContent = cfg.particleLimit;
                }
                if (cfg.info !== undefined && infoToggle) {
                    infoToggle.checked = cfg.info;
                    targetExtraInfoAlpha = cfg.info ? 1 : 0;
                    currentExtraInfoAlpha = targetExtraInfoAlpha;
                }

                if (!isPlaying) drawFrame(currentTime);
            })
            .catch(() => {});
    }

    // ==================== 初始 ====================
    loadAndApplyConfig();
    drawFrame(0);