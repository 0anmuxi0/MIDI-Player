<template>
  <div class="app-shell">
    <main class="app-content">
      <!-- 可视化画布 -->
      <section
        ref="canvasCardEl"
        class="win-card canvas-card"
        :style="canvasHeight ? { height: canvasHeight + 'px' } : undefined">
        <div ref="wrapperEl" class="canvas-wrapper">
          <canvas ref="canvasEl"></canvas>

          <WinButton
            class="canvas-fs-btn"
            Style="SubtleButtonStyle"
            Content="⛶"
            @Click="toggleFullscreen" />

          <div v-if="loading.visible" class="loading-overlay">
            <div class="loading-panel">
              <WinProgressBar :IsIndeterminate="true" :MinWidth="260" />
              <WinTextBlock Text="正在加载 MIDI 文件…" />
              <div class="progress-wrap">
                <WinProgressBar :Value="loading.percent" :Maximum="100" />
              </div>
              <WinTextBlock class="loading-percentage" :Text="Math.round(loading.percent) + '%'" />
            </div>
          </div>
        </div>
        <div
          class="canvas-resize-handle"
          :class="{ 'is-dragging': resizing }"
          title="上下拖动调整显示高度"
          @pointerdown="onResizeStart"></div>
      </section>

      <!-- 播放控制 -->
      <section class="win-card playback-card">
        <div class="playback-row">
          <input ref="fileInputEl" type="file" accept=".mid,.midi" style="display: none" @change="onFileChange" />
          <WinButton Content="上传 MIDI 文件" Style="AccentButtonStyle" @Click="pickFile" />
          <WinButton :Content="playing ? '暂停' : '播放'" :IsEnabled="hasMidi" @Click="togglePlay" />
          <WinTextBlock class="time-label" :Text="formatTime(currentTime)" />
          <div class="progress-slider">
            <WinSlider
              :Value="progressValue"
              :Minimum="0"
              :Maximum="progressMax"
              :StepFrequency="0.1"
              :IsEnabled="hasMidi"
              @update:Value="onSeekInput" />
          </div>
          <WinTextBlock class="time-label" :Text="formatTime(totalDuration)" />
          <WinButton
            Content="循环"
            :Style="loop ? 'AccentButtonStyle' : ''"
            @Click="toggleLoop" />
        </div>
      </section>

      <!-- 播放设置 -->
      <section class="win-card settings-card">
        <div class="win-card-header">
          <WinTextBlock Text="播放设置" FontWeight="600" />
        </div>
        <div class="settings-body-compact">
        <WinSettingsCard Header="外观">
          <WinSelectorBar
            :Items="themeOptions"
            :SelectedItem="themeSelected"
            @update:SelectedItem="onThemeSelect" />
        </WinSettingsCard>

        <WinSettingsCard Header="音量">
          <div class="setting-control">
            <WinTextBlock class="setting-value" :Text="volume + ' dB'" />
            <div class="setting-slider">
              <WinSlider
                :Value="volume"
                :Minimum="-40"
                :Maximum="0"
                :StepFrequency="1"
                @update:Value="v => { volume = v; player?.setVolume(v) }" />
            </div>
          </div>
        </WinSettingsCard>

        <WinSettingsCard Header="瀑布流速度">
          <div class="setting-control">
            <WinTextBlock class="setting-value" :Text="String(speed)" />
            <div class="setting-slider">
              <WinSlider
                :Value="speed"
                :Minimum="128"
                :Maximum="2048"
                :StepFrequency="16"
                @update:Value="v => { speed = v; player?.setSpeed(v) }" />
            </div>
          </div>
        </WinSettingsCard>

        <WinSettingsCard Header="播放速度">
          <div class="setting-control">
            <WinTextBlock class="setting-value" :Text="'×' + playbackRate.toFixed(2)" />
            <div class="setting-slider">
              <WinSlider
                :Value="playbackRate"
                :Minimum="0.5"
                :Maximum="2"
                :StepFrequency="0.25"
                @update:Value="v => { playbackRate = v; player?.setPlaybackRate(v) }" />
            </div>
          </div>
        </WinSettingsCard>

        <WinSettingsCard Header="判定线位置">
          <div class="setting-control">
            <WinTextBlock class="setting-value" :Text="Math.round(hitLinePosition * 100) + '%'" />
            <div class="setting-slider">
              <WinSlider
                :Value="hitLinePosition"
                :Minimum="0.1"
                :Maximum="0.9"
                :StepFrequency="0.05"
                @update:Value="v => { hitLinePosition = v; player?.setHitLinePosition(v) }" />
            </div>
          </div>
        </WinSettingsCard>

        <WinSettingsCard Header="方向">
          <WinSelectorBar
            :Items="directionOptions"
            :SelectedItem="directionSelected"
            @update:SelectedItem="onDirectionSelect" />
        </WinSettingsCard>

        <WinSettingsCard Header="辅助信息">
          <WinToggleSwitch
            :IsOn="infoEnabled"
            @update:IsOn="v => { infoEnabled = v; player?.setInfoEnabled(v) }" />
        </WinSettingsCard>

        <WinSettingsCard Header="粒子特效">
          <WinToggleSwitch
            :IsOn="particlesEnabled"
            @update:IsOn="v => { particlesEnabled = v; player?.setParticlesEnabled(v) }" />
        </WinSettingsCard>

        <WinSettingsCard Header="粒子数量">
          <div class="setting-control">
            <WinTextBlock class="setting-value" :Text="particleLimitLabel" />
            <div class="setting-slider">
              <WinSlider
                :Value="particleLimit"
                :Minimum="256"
                :Maximum="2176"
                :StepFrequency="128"
                @update:Value="v => { particleLimit = v; player?.setParticleLimit(v) }" />
            </div>
          </div>
        </WinSettingsCard>

        <WinSettingsCard Header="音符发光">
          <WinToggleSwitch
            :IsOn="glowEnabled"
            @update:IsOn="v => { glowEnabled = v; player?.setGlowEnabled(v) }" />
        </WinSettingsCard>

        <WinSettingsCard Header="屏幕震动">
          <WinToggleSwitch
            :IsOn="shakeEnabled"
            @update:IsOn="v => { shakeEnabled = v; player?.setShakeEnabled(v) }" />
        </WinSettingsCard>

        <WinSettingsCard Header="震动幅度">
          <div class="setting-control">
            <WinTextBlock class="setting-value" :Text="String(shakeIntensity)" />
            <div class="setting-slider">
              <WinSlider
                :Value="shakeIntensity"
                :Minimum="2"
                :Maximum="32"
                :StepFrequency="1"
                @update:Value="v => { shakeIntensity = v; player?.setShakeIntensity(v) }" />
            </div>
          </div>
        </WinSettingsCard>
        </div>
      </section>

      <!-- 音轨 -->
      <section class="win-card track-panel">
        <div class="win-card-header">
          <WinTextBlock Text="音轨" FontWeight="600" />
        </div>

        <div v-if="meta" class="track-meta">
          <WinTextBlock :Text="meta.fileName" FontWeight="600" />
          <WinTextBlock :Text="meta.timeSig" Foreground="var(--text-secondary)" FontSize="12" />
          <WinTextBlock :Text="meta.bpm + ' BPM'" Foreground="var(--text-secondary)" FontSize="12" />
          <WinTextBlock :Text="meta.keySig + ' 大调'" Foreground="var(--text-secondary)" FontSize="12" />
          <WinTextBlock :Text="meta.totalNotes + ' 个音符'" Foreground="var(--text-secondary)" FontSize="12" />
        </div>

        <div class="track-list">
          <WinTextBlock
            v-if="tracks.length === 0"
            class="track-empty"
            Text="加载 MIDI 文件后显示音轨信息" />

          <WinSettingsCard
            v-for="(track, index) in tracks"
            :key="index"
            :Header="track.name"
            :Description="trackDescription(track)">
            <div class="track-row-extras">
              <WinToggleSwitch
                :IsOn="track.enabled"
                @update:IsOn="v => onTrackEnabled(index, v)" />
              <WinComboBox
                class="track-instrument-combo"
                :ItemsSource="instrumentItems"
                DisplayMemberPath="label"
                SelectedValuePath="value"
                :SelectedValue="track.instrument"
                :MinWidth="260"
                @update:SelectedValue="v => onTrackInstrument(index, v)" />
              <div class="track-volume-slider">
                <WinSlider
                  :Value="Math.round(track.volume * 100)"
                  :Minimum="0"
                  :Maximum="200"
                  :StepFrequency="5"
                  @update:Value="v => onTrackVolume(index, v / 100)" />
              </div>
              <WinTextBlock
                :Text="Math.round(track.volume * 100) + '%'"
                Foreground="var(--text-secondary)"
                FontSize="12" />
            </div>
          </WinSettingsCard>
        </div>
      </section>

      <WinTextBlock class="status-line" :Text="status" />
      <WinTextBlock class="hint-line" Text="空格暂停 / 继续 ｜ R 重置 ｜ 支持拖拽导入" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WinTextBlock from './winui/components/WinTextBlock.vue'
import WinButton from './winui/components/WinButton.vue'
import WinSlider from './winui/components/WinSlider.vue'
import WinProgressBar from './winui/components/WinProgressBar.vue'
import WinToggleSwitch from './winui/components/WinToggleSwitch.vue'
import WinSettingsCard from './winui/components/WinSettingsCard.vue'
import WinComboBox from './winui/components/WinComboBox.vue'
import WinSelectorBar from './winui/components/WinSelectorBar.vue'
import { createMidiPlayer } from './player/player.js'

interface TrackInfo {
  name: string
  instrumentName: string
  noteCount: number
  noteRange: string
  enabled: boolean
  volume: number
  instrument: string
  gmProgram: number | null
  isPercussion: boolean
  hue: number
  cc7Events: { time: number; value: number; percent: number }[]
}

type MidiPlayer = ReturnType<typeof createMidiPlayer>

const THEME_KEY = 'midiPlayer.theme'

/* ---------------- 主题 ---------------- */
const themeMode = ref<'light' | 'dark' | 'system'>('system')
const isDark = ref(false)

// WinSelectorBar 的 SelectedItem 必须是 Items 中的同一个对象引用
const themeOptions = [
  { Text: '浅色', Value: 'light' },
  { Text: '深色', Value: 'dark' },
  { Text: '跟随系统', Value: 'system' }
]
const themeSelected = computed(() => themeOptions.find(o => o.Value === themeMode.value) ?? themeOptions[2])

function onThemeSelect(item: unknown) {
  setTheme((item as { Value?: string } | null)?.Value)
}

function resolveDark(mode: string) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(mode: 'light' | 'dark' | 'system', persist = true) {
  themeMode.value = mode
  const dark = resolveDark(mode)
  isDark.value = dark
  const root = document.documentElement
  root.classList.toggle('theme-dark', dark)
  root.classList.toggle('theme-light', !dark)
  root.setAttribute('data-theme-mode', mode)
  if (persist) {
    try { localStorage.setItem(THEME_KEY, mode) } catch (e) { }
  }
  player?.refreshTheme(mode)
}

function setTheme(value: unknown) {
  if (value !== 'light' && value !== 'dark' && value !== 'system') return
  applyTheme(value)
}

let systemThemeQuery: MediaQueryList | null = null
function onSystemThemeChange() {
  if (themeMode.value === 'system') applyTheme('system', false)
}

/* ---------------- 状态 ---------------- */
const canvasEl = ref<HTMLCanvasElement | null>(null)
const wrapperEl = ref<HTMLElement | null>(null)
const canvasCardEl = ref<HTMLElement | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)

/* 画布高度：null 表示交给 CSS 默认（52vh）；拖拽后写入注册表持久化 */
const canvasHeight = ref<number | null>(null)
const resizing = ref(false)
const MIN_CANVAS_HEIGHT = 120

const playing = ref(false)
const status = ref('请上传 MIDI 文件')
const currentTime = ref(0)
const totalDuration = ref(0)
const progressValue = ref(0)
const isSeeking = ref(false)
const hasMidi = ref(false)
const loop = ref(false)
const loading = ref({ visible: false, percent: 0 })
const meta = ref<{ fileName: string; bpm: number; timeSig: string; keySig: string; totalNotes: number } | null>(null)
const tracks = ref<TrackInfo[]>([])

const volume = ref(-6)
const speed = ref(256)
const playbackRate = ref(1)
const hitLinePosition = ref(0.5)
const direction = ref<'horizontal' | 'vertical'>('horizontal')
const infoEnabled = ref(true)
const particlesEnabled = ref(true)
const glowEnabled = ref(true)
const shakeEnabled = ref(true)
const shakeIntensity = ref(8)
const particleLimit = ref(1024)

const directionOptions = [
  { Text: '水平', Value: 'horizontal' },
  { Text: '垂直', Value: 'vertical' }
]
const directionSelected = computed(() => directionOptions.find(o => o.Value === direction.value) ?? directionOptions[0])

function onDirectionSelect(item: unknown) {
  setDirection((item as { Value?: string } | null)?.Value)
}

const instrumentItems = ref<{ value: string; label: string }[]>([])

const progressMax = computed(() => Math.max(totalDuration.value, 1))
const particleLimitLabel = computed(() => (particleLimit.value >= 2176 ? '∞' : String(particleLimit.value)))

/* ---------------- 引擎 ---------------- */
let player: MidiPlayer | null = null

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function trackDescription(track: TrackInfo) {
  const parts: string[] = []
  if (track.instrumentName) parts.push(track.instrumentName)
  parts.push(`${track.noteCount} 个音符`)
  if (track.noteRange) parts.push(track.noteRange)
  return parts.join(' · ')
}

function onStateReady() {
  const canvas = canvasEl.value
  const wrapper = wrapperEl.value
  if (!canvas || !wrapper) return

  player = createMidiPlayer({
    canvas,
    wrapper,
    hooks: {
      onStatus: (text: string) => { status.value = text },
      onLoading: payload => { loading.value = payload },
      onPlaying: payload => { playing.value = payload.playing },
      onTime: payload => {
        totalDuration.value = payload.total
        if (isSeeking.value) return
        // 引擎每帧回调；UI 侧按 ~12fps 节流，避免与画布渲染争抢主线程
        const now = performance.now()
        if (now - lastTimeUiUpdate < 80) return
        lastTimeUiUpdate = now
        currentTime.value = payload.current
        progressValue.value = payload.current
      },
      onMeta: payload => { meta.value = payload },
      onTracks: payload => { tracks.value = payload.map(t => ({ ...t })) },
      onLoaded: payload => { hasMidi.value = payload.notes > 0 },
      onError: message => { status.value = message },
      onConfigLoaded: config => applyConfig(config),
      isLightTheme: () => !isDark.value
    }
  })

  instrumentItems.value = player.getInstrumentOptions()
  // 主题以本地存储为准，同步给引擎（写入 /api/config）
  player.refreshTheme(themeMode.value)
}

function applyConfig(config: Record<string, any>) {
  if (!config || typeof config !== 'object') return
  if (typeof config.volume === 'number') { volume.value = config.volume; player?.setVolume(config.volume) }
  if (typeof config.speed === 'number') { speed.value = config.speed; player?.setSpeed(config.speed) }
  if (typeof config.playbackRate === 'number') { playbackRate.value = config.playbackRate; player?.setPlaybackRate(config.playbackRate) }
  if (typeof config.hitLinePosition === 'number') { hitLinePosition.value = config.hitLinePosition; player?.setHitLinePosition(config.hitLinePosition) }
  if (config.direction === 'horizontal' || config.direction === 'vertical') { direction.value = config.direction; player?.setDirection(config.direction) }
  if (typeof config.particles === 'boolean') { particlesEnabled.value = config.particles; player?.setParticlesEnabled(config.particles) }
  if (typeof config.glow === 'boolean') { glowEnabled.value = config.glow; player?.setGlowEnabled(config.glow) }
  if (typeof config.shake === 'boolean') { shakeEnabled.value = config.shake; player?.setShakeEnabled(config.shake) }
  if (typeof config.shakeIntensity === 'number') { shakeIntensity.value = config.shakeIntensity; player?.setShakeIntensity(config.shakeIntensity) }
  if (typeof config.particleLimit === 'number') { particleLimit.value = config.particleLimit; player?.setParticleLimit(config.particleLimit) }
  if (typeof config.info === 'boolean') { infoEnabled.value = config.info; player?.setInfoEnabled(config.info) }
  if (typeof config.canvasHeight === 'number' && config.canvasHeight >= MIN_CANVAS_HEIGHT) {
    canvasHeight.value = Math.round(config.canvasHeight)
  }
}

/* ---------------- 画布高度拖拽 ---------------- */
function onResizeStart(event: PointerEvent) {
  const card = canvasCardEl.value
  if (!card) return
  event.preventDefault()

  const startY = event.clientY
  const startHeight = card.offsetHeight
  resizing.value = true
  document.body.style.cursor = 'ns-resize'

  const onMove = (moveEvent: PointerEvent) => {
    // 上限由鼠标位置自然决定（可拖到窗口底部，页面不够高就滚动），不再预留下方空间
    const maxHeight = Math.max(MIN_CANVAS_HEIGHT, window.innerHeight * 1.5)
    const next = startHeight + (moveEvent.clientY - startY)
    canvasHeight.value = Math.round(Math.min(Math.max(next, MIN_CANVAS_HEIGHT), maxHeight))
  }

  const onUp = () => {
    resizing.value = false
    document.body.style.cursor = ''
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    if (canvasHeight.value != null) player?.setCanvasHeight(canvasHeight.value)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

/* ---------------- 交互 ---------------- */
function pickFile() {
  fileInputEl.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) player?.loadFile(file)
  input.value = ''
}

function togglePlay() {
  player?.togglePlay()
}

function toggleLoop() {
  loop.value = !loop.value
  player?.setLoop(loop.value)
}

function onSeekCommit(value: number) {
  player?.seek(value)
}

let seekTimer: number | null = null
let lastTimeUiUpdate = 0

// WinSlider 的 update:Value 会在拖动过程中连续触发，
// 这里先本地跟手，停止拖动后再真正 seek，避免反复重建音频调度。
function onSeekInput(value: number) {
  isSeeking.value = true
  progressValue.value = value
  if (seekTimer !== null) window.clearTimeout(seekTimer)
  seekTimer = window.setTimeout(() => {
    seekTimer = null
    isSeeking.value = false
    onSeekCommit(value)
  }, 160)
}

function toggleFullscreen() {
  player?.toggleFullscreen()
}

function onTrackEnabled(index: number, value: boolean) {
  const track = tracks.value[index]
  if (!track) return
  track.enabled = value
  player?.setTrackEnabled(index, value)
}

function onTrackVolume(index: number, value: number) {
  const track = tracks.value[index]
  if (!track) return
  track.volume = value
  player?.setTrackVolume(index, value)
}

function onTrackInstrument(index: number, value: unknown) {
  if (typeof value !== 'string') return
  const track = tracks.value[index]
  if (!track) return
  track.instrument = value
  player?.setTrackInstrument(index, value)
}

function setDirection(value: unknown) {
  if (value !== 'horizontal' && value !== 'vertical') return
  direction.value = value
  player?.setDirection(value)
}

/* ---------------- 生命周期 ---------------- */
let systemDarkRemoval: (() => void) | null = null

onMounted(() => {
  let stored: string | null = null
  try { stored = localStorage.getItem(THEME_KEY) } catch (e) { }
  applyTheme(
    stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system',
    false
  )

  systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemThemeQuery.addEventListener('change', onSystemThemeChange)
  systemDarkRemoval = () => systemThemeQuery?.removeEventListener('change', onSystemThemeChange)

  onStateReady()

  // 检查音色库是否就位（外置分发时用户可能漏了 soundfonts.zip）
  fetch('/api/env')
    .then(r => r.json())
    .then(env => {
      if (env && env.soundfonts === false) {
        status.value = '未找到音色库：请把 soundfonts.zip 放到程序同目录后重启'
      }
    })
    .catch(() => { })

  // 界面已渲染：淡出启动画面（等两帧，确保卡片入场动画已经铺开）
  requestAnimationFrame(() => requestAnimationFrame(dismissSplash))
})

/* ---------------- 启动画面淡出 ---------------- */
function dismissSplash() {
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.classList.add('is-hidden')
  const remove = () => splash.remove()
  splash.addEventListener('transitionend', remove, { once: true })
  window.setTimeout(remove, 700)
}

onBeforeUnmount(() => {
  systemDarkRemoval?.()
  player?.destroy()
  player = null
})
</script>
