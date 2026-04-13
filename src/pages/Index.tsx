import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── AUDIO ENGINE ────────────────────────────────────────────────────────────

function createAudioContext(): AudioContext | null {
  try {
     
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playBrushSound(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 0.12;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 3000 + Math.random() * 2000;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

function playWaterDrop(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  const baseFreq = 800 + Math.random() * 600;
  osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, ctx.currentTime + 0.25);

  filter.type = "lowpass";
  filter.frequency.value = 2000;

  gain.gain.setValueAtTime(0.22, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);

  // Second harmonic drop
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(baseFreq * 1.6, ctx.currentTime + 0.04);
  osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + 0.2);
  gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.04);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.04);
  osc2.stop(ctx.currentTime + 0.2);
}

function playForestRustle(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800 + Math.random() * 400;
  filter.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

const SOUND_PLAYERS: Record<string, (ctx: AudioContext) => void> = {
  brush: playBrushSound,
  water: playWaterDrop,
  rain: playWaterDrop,
  forest: playForestRustle,
  fire: playForestRustle,
};

function useAudio(soundId: string, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayRef = useRef(0);

  const play = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    const minInterval = soundId === "brush" ? 60 : soundId === "water" || soundId === "rain" ? 200 : 150;
    if (now - lastPlayRef.current < minInterval) return;
    lastPlayRef.current = now;

    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = createAudioContext();
    }
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const player = SOUND_PLAYERS[soundId] || playBrushSound;
    try { player(ctx); } catch (_e) { /* audio not supported */ }
  }, [soundId, enabled]);

  useEffect(() => {
    return () => { ctxRef.current?.close(); };
  }, []);

  return play;
}

// ─── PROGRESS (localStorage) ─────────────────────────────────────────────────

const PROGRESS_KEY = "raskraska_progress_v1";

type ProgressMap = Record<number, { completed: boolean; stars: number }>;

function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(map: ProgressMap) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch { /* quota exceeded — ignore */ }
}

function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());

  const markComplete = useCallback((id: number, stars: number) => {
    setProgress((prev) => {
      const next = { ...prev, [id]: { completed: true, stars } };
      saveProgress(next);
      return next;
    });
  }, []);

  const getPage = useCallback(
    (id: number) => progress[id] ?? { completed: false, stars: 0 },
    [progress]
  );

  const totalStars = Object.values(progress).reduce((acc, p) => acc + p.stars, 0);
  const completedCount = Object.values(progress).filter((p) => p.completed).length;

  return { progress, markComplete, getPage, totalStars, completedCount };
}

// ─── DATA ────────────────────────────────────────────────────────────────────

// Image URLs shortcuts
const IMG = {
  unicorn:  "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/67cef695-d5ed-4ae4-87a9-bb6458486857.jpg",
  dragon:   "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/2c1adf01-02de-41a1-815f-83fe5e70e9d6.jpg",
  mermaid:  "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/ffb99e1f-164d-47a9-a26e-e94459e5a4f5.jpg",
  witch:    "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/3c8c36e3-ce7a-4a1f-8ead-539a73517fdf.jpg",
  car:      "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/f8e9f6a7-9607-4046-921b-30c2f250a431.jpg",
  food:     "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/1d031119-5bd0-4af9-8a5f-ad36f391275b.jpg",
  icecream: "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/3bc51471-b1a9-4ec4-9268-98eeb82755bd.jpg",
  animals:  "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/17e4cd4a-0331-4716-b491-3f569665eee2.jpg",
  plants:   "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/51cd15fe-a75c-45b7-8d5f-b207dab26887.jpg",
};

type Difficulty = "Легко" | "Средне" | "Сложно";

const COLORING_PAGES: {
  id: number; title: string; category: string;
  difficulty: Difficulty; emoji: string; image: string;
  completed: boolean; stars: number;
}[] = [
  // ── Сказочные (оригинальные) ──────────────────────────────────────────────
  { id:1,  title:"Единорог в лесу",      category:"Сказочные", difficulty:"Легко",  emoji:"🦄",  image:IMG.unicorn,  completed:false, stars:0 },
  { id:2,  title:"Дракон и замок",       category:"Сказочные", difficulty:"Средне", emoji:"🐉",  image:IMG.dragon,   completed:true,  stars:3 },
  { id:3,  title:"Русалочка",            category:"Сказочные", difficulty:"Средне", emoji:"🧜‍♀️",image:IMG.mermaid,  completed:false, stars:0 },
  { id:4,  title:"Ведьма на метле",      category:"Сказочные", difficulty:"Сложно", emoji:"🧙‍♀️",image:IMG.witch,    completed:false, stars:0 },
  { id:5,  title:"Феи и эльфы",          category:"Сказочные", difficulty:"Легко",  emoji:"🧚",  image:IMG.unicorn,  completed:false, stars:0 },
  { id:6,  title:"Волшебный замок",      category:"Сказочные", difficulty:"Сложно", emoji:"🏰",  image:IMG.dragon,   completed:false, stars:0 },

  // ── Машинки ───────────────────────────────────────────────────────────────
  { id:7,  title:"Гоночная машина",      category:"Машинки",   difficulty:"Легко",  emoji:"🏎️",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/5741ecf0-5b66-4ee8-affd-7b3508eeb6b2.jpg", completed:false, stars:0 },
  { id:8,  title:"Пожарная машина",      category:"Машинки",   difficulty:"Легко",  emoji:"🚒",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/fdd3b35e-f85d-483e-a116-6a49bb41dc52.jpg", completed:false, stars:0 },
  { id:9,  title:"Полицейская машина",   category:"Машинки",   difficulty:"Легко",  emoji:"🚓",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/627f5613-a861-4deb-b93e-fb650296f378.jpg", completed:false, stars:0 },
  { id:10, title:"Грузовик монстр",      category:"Машинки",   difficulty:"Средне", emoji:"🚛",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/2ff21308-92d7-4ab6-b404-14e2aa733321.jpg", completed:false, stars:0 },
  { id:11, title:"Школьный автобус",     category:"Машинки",   difficulty:"Легко",  emoji:"🚌",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/47e7253c-89f6-44d0-adc8-0f9e0300b271.jpg", completed:false, stars:0 },
  { id:12, title:"Спортивный кабриолет", category:"Машинки",   difficulty:"Средне", emoji:"🚗",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/7a7f205c-74e5-4d48-a55b-dfc9a124d6bf.jpg", completed:false, stars:0 },
  { id:13, title:"Экскаватор",           category:"Машинки",   difficulty:"Средне", emoji:"🚜",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/5ccae717-42bd-4a41-9cfb-ba5e8bfaafcb.jpg", completed:false, stars:0 },
  { id:14, title:"Трактор",             category:"Машинки",   difficulty:"Легко",  emoji:"🚜",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/2585681b-de25-4c71-8483-94d65addb0f4.jpg", completed:false, stars:0 },
  { id:15, title:"Вертолёт",            category:"Машинки",   difficulty:"Средне", emoji:"🚁",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/2e4f2daa-4512-4588-bd73-8a5d901fecd5.jpg", completed:false, stars:0 },
  { id:16, title:"Ракета",              category:"Машинки",   difficulty:"Средне", emoji:"🚀",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/adb754c0-bfe4-4895-9b6a-a5b93e77a964.jpg", completed:false, stars:0 },
  { id:17, title:"Паровоз",            category:"Машинки",   difficulty:"Легко",  emoji:"🚂",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/eb2f92b5-c9fc-4f77-ad6f-b52afa940866.jpg", completed:false, stars:0 },
  { id:18, title:"Самолёт",            category:"Машинки",   difficulty:"Средне", emoji:"✈️",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/4a5e23f6-1da2-46d8-9bbf-8ebb0d777267.jpg", completed:false, stars:0 },
  { id:19, title:"Яхта",               category:"Машинки",   difficulty:"Средне", emoji:"⛵",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/df168ce1-c888-4747-9012-094398c5b178.jpg", completed:false, stars:0 },
  { id:20, title:"Формула 1",          category:"Машинки",   difficulty:"Сложно", emoji:"🏁",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/4d95efa7-166e-409a-8976-1296a0ddb211.jpg", completed:false, stars:0 },
  { id:21, title:"Мотоцикл",           category:"Машинки",   difficulty:"Легко",  emoji:"🏍️",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/24d6ce07-5680-4b7d-b4c5-c778f0337e3d.jpg", completed:false, stars:0 },
  { id:22, title:"Субмарина",          category:"Машинки",   difficulty:"Средне", emoji:"🤿",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/f7a52fc5-e1ec-480a-b6a3-d46faca12fde.jpg", completed:false, stars:0 },
  { id:23, title:"Дирижабль",          category:"Машинки",   difficulty:"Сложно", emoji:"🎈",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/c9373eed-4b26-4923-bd31-8e8074d1f9eb.jpg", completed:false, stars:0 },
  { id:24, title:"Квадроцикл",         category:"Машинки",   difficulty:"Легко",  emoji:"🛻",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/b00d20c0-9d80-4074-8d59-08fc144862a7.jpg", completed:false, stars:0 },
  { id:25, title:"Скорая помощь",      category:"Машинки",   difficulty:"Легко",  emoji:"🚑",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/9027aa63-4547-4deb-bcb2-55b0465c969e.jpg", completed:false, stars:0 },
  { id:26, title:"Кран строительный",  category:"Машинки",   difficulty:"Сложно", emoji:"🏗️",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/d8a1ff95-6717-4d36-9d22-8ca1cac51b2d.jpg", completed:false, stars:0 },

  // ── Еда ───────────────────────────────────────────────────────────────────
  { id:27, title:"Пицца Маргарита",    category:"Еда",       difficulty:"Легко",  emoji:"🍕",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/6bf783fd-c597-41bb-9dad-2c2508b5e525.jpg", completed:false, stars:0 },
  { id:28, title:"Большой бургер",     category:"Еда",       difficulty:"Легко",  emoji:"🍔",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/5e2d8fcc-982f-4202-8bd6-89a0da4d0402.jpg", completed:false, stars:0 },
  { id:29, title:"Суши и роллы",       category:"Еда",       difficulty:"Средне", emoji:"🍣",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/f5a8fcdd-b9a0-4725-b389-49dca31dc5f0.jpg", completed:false, stars:0 },
  { id:30, title:"Праздничный торт",   category:"Еда",       difficulty:"Средне", emoji:"🎂",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/e9e2aa30-bb32-424c-b0db-367da5aec345.jpg", completed:false, stars:0 },
  { id:31, title:"Капкейки",           category:"Еда",       difficulty:"Легко",  emoji:"🧁",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/d496706d-a984-48ce-923d-c8c39f5a7e92.jpg", completed:false, stars:0 },
  { id:32, title:"Пончики",            category:"Еда",       difficulty:"Легко",  emoji:"🍩",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/290546ed-7d09-4153-8161-e64807625cca.jpg", completed:false, stars:0 },
  { id:33, title:"Тако и буррито",     category:"Еда",       difficulty:"Средне", emoji:"🌮",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/062e1cef-3d15-4fb3-b5a4-971dcb4fbdff.jpg", completed:false, stars:0 },
  { id:34, title:"Рамен",             category:"Еда",       difficulty:"Средне", emoji:"🍜",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/408cc43b-894b-48ca-bbea-d76f6ee6c8ec.jpg", completed:false, stars:0 },
  { id:35, title:"Блинчики",          category:"Еда",       difficulty:"Легко",  emoji:"🥞",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/fbca2906-8393-4f6b-bacd-79bf31203291.jpg", completed:false, stars:0 },
  { id:36, title:"Клубничный пирог",  category:"Еда",       difficulty:"Средне", emoji:"🍓",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/d4a41426-2fc6-4026-b1cc-2ce9fd0ebcb0.jpg", completed:false, stars:0 },
  { id:37, title:"Вафли с сиропом",   category:"Еда",       difficulty:"Легко",  emoji:"🧇",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/4bff4416-9536-449e-9b69-f0f8bb27fc23.jpg", completed:false, stars:0 },
  { id:38, title:"Фрукты в корзинке", category:"Еда",       difficulty:"Легко",  emoji:"🍎",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/b039363b-0b02-44a2-b535-58787f0556db.jpg", completed:false, stars:0 },
  { id:39, title:"Арбуз",             category:"Еда",       difficulty:"Легко",  emoji:"🍉",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/d51c7cf0-58c3-4d4c-9c6e-9dd716aae731.jpg", completed:false, stars:0 },
  { id:40, title:"Шоколадный фонтан", category:"Еда",       difficulty:"Сложно", emoji:"🍫",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/8fe9e66d-904e-413d-ad4a-1deaf8005627.jpg", completed:false, stars:0 },
  { id:41, title:"Чаепитие",          category:"Еда",       difficulty:"Средне", emoji:"🍵",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/74f86757-f04d-4259-9acd-0eba76fe74d8.jpg", completed:false, stars:0 },
  { id:42, title:"Пирожное Макарон",  category:"Еда",       difficulty:"Средне", emoji:"🍬",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/1d4fe2ca-8756-4980-ab77-65ce831b7fac.jpg", completed:false, stars:0 },
  { id:43, title:"Лимонад",           category:"Еда",       difficulty:"Легко",  emoji:"🍋",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/85c178d2-a99a-471f-bc50-5651bf537ac5.jpg", completed:false, stars:0 },
  { id:44, title:"Паста с соусом",    category:"Еда",       difficulty:"Средне", emoji:"🍝",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/3c6b67b8-6969-45df-b877-e096fde36003.jpg", completed:false, stars:0 },
  { id:45, title:"Карамельное яблоко",category:"Еда",       difficulty:"Легко",  emoji:"🍎",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/b46458c8-e41a-455a-b651-cd2a8d1dc7cb.jpg", completed:false, stars:0 },
  { id:46, title:"Мясное барбекю",    category:"Еда",       difficulty:"Сложно", emoji:"🍖",  image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/e342d028-46f2-47ab-8f05-8287c13a9b3b.jpg", completed:false, stars:0 },

  // ── Животные ──────────────────────────────────────────────────────────────
  { id:67, title:"Милый щенок",          category:"Животные", difficulty:"Легко",  emoji:"🐶", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/d40c0a8d-0750-436e-8cc0-c94b5d756785.jpg", completed:false, stars:0 },
  { id:68, title:"Пушистый котёнок",     category:"Животные", difficulty:"Легко",  emoji:"🐱", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/88ec23bd-fbf1-42df-835b-2c7a04a8ddc4.jpg", completed:false, stars:0 },
  { id:69, title:"Зайчик",              category:"Животные", difficulty:"Легко",  emoji:"🐰", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/191ba39e-7d91-4492-b8a2-ea88643c07be.jpg", completed:false, stars:0 },
  { id:70, title:"Медвежонок",          category:"Животные", difficulty:"Легко",  emoji:"🐻", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/6cafddc6-b35c-4482-b6a1-b3369ac22e39.jpg", completed:false, stars:0 },
  { id:71, title:"Маленькая лиса",      category:"Животные", difficulty:"Средне", emoji:"🦊", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/9fc4e376-c3ee-41ff-82b5-16dda6cdbd5a.jpg", completed:false, stars:0 },
  { id:72, title:"Пингвин",            category:"Животные", difficulty:"Легко",  emoji:"🐧", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/32b390c8-ff03-4977-a281-38c9b3337586.jpg", completed:false, stars:0 },
  { id:73, title:"Жираф",             category:"Животные", difficulty:"Средне", emoji:"🦒", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/8a8db889-b904-45d6-a0bb-7e10cb8d1e9c.jpg", completed:false, stars:0 },
  { id:74, title:"Слон",              category:"Животные", difficulty:"Средне", emoji:"🐘", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/0e66dc6d-c21c-4da6-8a43-b806e073d756.jpg", completed:false, stars:0 },
  { id:75, title:"Лев-царь",          category:"Животные", difficulty:"Средне", emoji:"🦁", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/d8f9998d-0932-43f7-8977-74196e6c15f5.jpg", completed:false, stars:0 },
  { id:76, title:"Тигрёнок",          category:"Животные", difficulty:"Средне", emoji:"🐯", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/63ba1e65-bb47-40aa-8ee3-65922e86cb91.jpg", completed:false, stars:0 },
  { id:77, title:"Дельфин",           category:"Животные", difficulty:"Средне", emoji:"🐬", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/c8de89b8-a768-41f7-bd9d-5ea25b582809.jpg", completed:false, stars:0 },
  { id:78, title:"Сова",             category:"Животные", difficulty:"Легко",  emoji:"🦉", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/cce74802-28d4-48fa-9591-1c887e74a3ab.jpg", completed:false, stars:0 },
  { id:79, title:"Фламинго",          category:"Животные", difficulty:"Средне", emoji:"🦩", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/dd542d81-d005-4c4e-b0e0-8de99844c295.jpg", completed:false, stars:0 },
  { id:80, title:"Бабочка",           category:"Животные", difficulty:"Легко",  emoji:"🦋", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/717f09b3-9546-4160-ab57-a5434eb2ba05.jpg", completed:false, stars:0 },
  { id:81, title:"Черепаха",          category:"Животные", difficulty:"Легко",  emoji:"🐢", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/30353b5c-da89-4004-a2ad-8ed6c155ecd6.jpg", completed:false, stars:0 },
  { id:82, title:"Енот",             category:"Животные", difficulty:"Средне", emoji:"🦝", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/b176c491-289d-47bd-a4e4-a5bcdd97fd88.jpg", completed:false, stars:0 },
  { id:83, title:"Панда",            category:"Животные", difficulty:"Легко",  emoji:"🐼", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/7dbf420b-dd59-45e2-9de5-cb14683add78.jpg", completed:false, stars:0 },
  { id:84, title:"Лягушка",          category:"Животные", difficulty:"Легко",  emoji:"🐸", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/8a8fc90a-7992-4248-b46b-b3cbd7edec4e.jpg", completed:false, stars:0 },
  { id:85, title:"Хомячок",          category:"Животные", difficulty:"Легко",  emoji:"🐹", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/44a43624-1e0b-4362-8559-a9d871a6fc74.jpg", completed:false, stars:0 },
  { id:86, title:"Крокодил",         category:"Животные", difficulty:"Сложно", emoji:"🐊", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/c657d2c9-9ec8-454a-9388-3b40637a552c.jpg", completed:false, stars:0 },
  { id:87, title:"Осьминог",         category:"Животные", difficulty:"Средне", emoji:"🐙", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/b774b8af-2e1d-43de-8398-4f4d8402ad03.jpg", completed:false, stars:0 },
  { id:88, title:"Попугай",          category:"Животные", difficulty:"Средне", emoji:"🦜", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/79449a1e-0d90-449d-abf5-28fb0dbfefed.jpg", completed:false, stars:0 },
  { id:89, title:"Лошадка пони",     category:"Животные", difficulty:"Средне", emoji:"🐴", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/d3ecb781-8b9f-403a-9dff-00a72e86eb8c.jpg", completed:false, stars:0 },
  { id:90, title:"Медуза",           category:"Животные", difficulty:"Средне", emoji:"🪼", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/fb1c35e8-6c1c-4852-94fb-68fed4b1e0d8.jpg", completed:false, stars:0 },
  { id:91, title:"Олень в лесу",     category:"Животные", difficulty:"Сложно", emoji:"🦌", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/a286a1b4-4f41-4018-87d8-7e660b8f6200.jpg", completed:false, stars:0 },
  { id:92, title:"Зебра",            category:"Животные", difficulty:"Сложно", emoji:"🦓", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/de79334a-e788-4654-be64-fd53890630be.jpg", completed:false, stars:0 },

  // ── Растения ──────────────────────────────────────────────────────────────
  { id:93,  title:"Подсолнух",          category:"Растения", difficulty:"Легко",  emoji:"🌻", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/7d534e16-3f85-4b46-9482-f42379b826b2.jpg", completed:false, stars:0 },
  { id:94,  title:"Кактус в горшке",    category:"Растения", difficulty:"Легко",  emoji:"🌵", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/f4a5236d-1070-4462-b1d6-ddacc0fc496d.jpg", completed:false, stars:0 },
  { id:95,  title:"Роза",              category:"Растения", difficulty:"Средне", emoji:"🌹", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/e7f25fc5-173f-42d5-9f8b-7477da69de12.jpg", completed:false, stars:0 },
  { id:96,  title:"Тюльпаны",          category:"Растения", difficulty:"Легко",  emoji:"🌷", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/19a9686e-48eb-4b5b-b4cc-75363e7e7ae1.jpg", completed:false, stars:0 },
  { id:97,  title:"Монстера",          category:"Растения", difficulty:"Средне", emoji:"🪴", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/4e5d912f-8464-4cb2-8b2c-89d6c7101c78.jpg", completed:false, stars:0 },
  { id:98,  title:"Баобаб",            category:"Растения", difficulty:"Сложно", emoji:"🌳", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/df2d99c3-c5fe-497c-9447-0af812015583.jpg", completed:false, stars:0 },
  { id:99,  title:"Сакура",            category:"Растения", difficulty:"Средне", emoji:"🌸", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/d4bb3a1c-0275-46d1-8d3a-9c110d11d300.jpg", completed:false, stars:0 },
  { id:100, title:"Лаванда",           category:"Растения", difficulty:"Легко",  emoji:"💜", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/ae982291-d442-4fe2-9e4f-1abe38e05ad0.jpg", completed:false, stars:0 },
  { id:101, title:"Орхидея",           category:"Растения", difficulty:"Средне", emoji:"🌺", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/4aec7e2b-1297-4142-b05a-9fd3787ce675.jpg", completed:false, stars:0 },
  { id:102, title:"Грибы в лесу",      category:"Растения", difficulty:"Средне", emoji:"🍄", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/dc54bedd-5285-4927-a559-ae4293e044e4.jpg", completed:false, stars:0 },
  { id:103, title:"Бамбук",            category:"Растения", difficulty:"Средне", emoji:"🎋", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/e7c7e317-65d4-43e2-9b4d-05068c633db1.jpg", completed:false, stars:0 },
  { id:104, title:"Плющ на стене",     category:"Растения", difficulty:"Сложно", emoji:"🌿", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/db7d1e26-e20b-4bbb-9b38-42ad7b0f1425.jpg", completed:false, stars:0 },
  { id:105, title:"Ромашковое поле",   category:"Растения", difficulty:"Легко",  emoji:"🌼", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/f77cb1ac-acf5-4ae4-9e8f-0e4b026a57d1.jpg", completed:false, stars:0 },
  { id:106, title:"Лотос на воде",     category:"Растения", difficulty:"Средне", emoji:"🪷", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/3ea69760-2c9d-4107-a8e9-fb5b1d1d42fb.jpg", completed:false, stars:0 },
  { id:107, title:"Папоротник",        category:"Растения", difficulty:"Легко",  emoji:"🍀", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/5bc57147-8e8c-42bb-945b-5183c48cb0b3.jpg", completed:false, stars:0 },
  { id:108, title:"Пальма на пляже",   category:"Растения", difficulty:"Легко",  emoji:"🌴", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/8b43237f-ea68-473b-b580-b8c12228c85c.jpg", completed:false, stars:0 },
  { id:109, title:"Тыква с листьями",  category:"Растения", difficulty:"Средне", emoji:"🎃", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/5c147d7a-b257-4fad-8fe5-e20e74512bf7.jpg", completed:false, stars:0 },
  { id:110, title:"Волшебное дерево",  category:"Растения", difficulty:"Сложно", emoji:"🌳", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/16fa67df-a095-4db9-933b-a7575f2e2d7a.jpg", completed:false, stars:0 },
  { id:111, title:"Клубника в саду",   category:"Растения", difficulty:"Легко",  emoji:"🍓", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/694fd58c-8613-4ef9-900c-c1adced9a2fe.jpg", completed:false, stars:0 },
  { id:112, title:"Яблоня",            category:"Растения", difficulty:"Средне", emoji:"🍎", image:"https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/64901703-966f-4115-8006-b9d2b25a19d0.jpg", completed:false, stars:0 },
];

const ACHIEVEMENTS = [
  { id: 1, emoji: "⭐", title: "Первый штрих", desc: "Начни раскрашивать", unlocked: true },
  { id: 2, emoji: "🎨", title: "Художник", desc: "Заверши 3 раскраски", unlocked: true },
  { id: 3, emoji: "✨", title: "Мастер магии", desc: "Получи 3 звезды", unlocked: false },
  { id: 4, emoji: "🏆", title: "Волшебник", desc: "Открой все раскраски", unlocked: false },
  { id: 5, emoji: "💎", title: "Легенда", desc: "Заверши все с 3★", unlocked: false },
  { id: 6, emoji: "🌟", title: "Звёздный", desc: "Соберите 15 звёзд", unlocked: false },
];

const COLORS = [
  "#FF6B9D", "#FF8E4F", "#FFD166", "#06D6A0",
  "#118AB2", "#9B5DE5", "#F72585", "#7FFFAF",
  "#FF99CC", "#B5E48C", "#A8DADC", "#E9C46A",
  "#2EC4B6", "#E76F51", "#264653", "#FFFFFF",
];

const SOUNDS = [
  { id: "brush", emoji: "🖌️", label: "Кисть" },
  { id: "rain", emoji: "🌧️", label: "Дождь" },
  { id: "forest", emoji: "🌲", label: "Лес" },
  { id: "water", emoji: "💧", label: "Вода" },
  { id: "fire", emoji: "🔥", label: "Огонь" },
];

// ─── STARS BACKGROUND ────────────────────────────────────────────────────────

function StarsBackground() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    duration: Math.random() * 4 + 2,
    delay: Math.random() * 5,
  }));

  return (
    <div className="stars">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            "--duration": `${s.duration}s`,
            "--delay": `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── FLOATING PARTICLES ───────────────────────────────────────────────────────

function FloatingParticles() {
  const particles = ["✨", "⭐", "🌟", "💫", "✦", "◆"];
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="absolute text-lg opacity-20 animate-float"
          style={{
            left: `${10 + i * 12}%`,
            top: `${15 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${5 + i * 0.5}s`,
          }}
        >
          {particles[i % particles.length]}
        </div>
      ))}
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────

function Header({
  screen,
  onBack,
  totalStars,
}: {
  screen: string;
  onBack: () => void;
  totalStars: number;
}) {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        {screen !== "home" ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon name="ChevronLeft" size={20} />
            <span className="font-body text-sm">Назад</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <h1 className="font-display text-xl font-bold text-primary text-glow-gold">
              Волшебная Раскраска
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5">
          <span className="text-sm">⭐</span>
          <span className="font-body font-semibold text-primary text-sm">{totalStars}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary/30 border border-secondary/40 flex items-center justify-center text-sm">
          🧙
        </div>
      </div>
    </header>
  );
}

// ─── ZONE COLORING ENGINE ────────────────────────────────────────────────────

// Each page has 4 zones defined as {cx, cy, rx, ry} ellipses (relative 0..1)
const ZONES_MAP: Record<number, { cx: number; cy: number; rx: number; ry: number; label: string }[]> = {
  1: [
    { cx: 0.5,  cy: 0.22, rx: 0.22, ry: 0.18, label: "Грива" },
    { cx: 0.5,  cy: 0.5,  rx: 0.28, ry: 0.22, label: "Тело" },
    { cx: 0.3,  cy: 0.72, rx: 0.15, ry: 0.14, label: "Ноги" },
    { cx: 0.72, cy: 0.68, rx: 0.18, ry: 0.16, label: "Хвост" },
  ],
  2: [
    { cx: 0.5,  cy: 0.18, rx: 0.2,  ry: 0.16, label: "Голова" },
    { cx: 0.5,  cy: 0.45, rx: 0.3,  ry: 0.22, label: "Крылья" },
    { cx: 0.28, cy: 0.7,  rx: 0.2,  ry: 0.18, label: "Замок" },
    { cx: 0.72, cy: 0.72, rx: 0.18, ry: 0.16, label: "Хвост" },
  ],
  3: [
    { cx: 0.5,  cy: 0.2,  rx: 0.2,  ry: 0.16, label: "Волосы" },
    { cx: 0.5,  cy: 0.44, rx: 0.25, ry: 0.2,  label: "Хвост" },
    { cx: 0.28, cy: 0.68, rx: 0.2,  ry: 0.16, label: "Кораллы" },
    { cx: 0.72, cy: 0.65, rx: 0.18, ry: 0.15, label: "Рыбки" },
  ],
  4: [
    { cx: 0.5,  cy: 0.18, rx: 0.18, ry: 0.15, label: "Шляпа" },
    { cx: 0.5,  cy: 0.42, rx: 0.25, ry: 0.2,  label: "Плащ" },
    { cx: 0.4,  cy: 0.68, rx: 0.22, ry: 0.16, label: "Метла" },
    { cx: 0.72, cy: 0.6,  rx: 0.18, ry: 0.15, label: "Зелье" },
  ],
  5: [
    { cx: 0.5,  cy: 0.2,  rx: 0.2,  ry: 0.16, label: "Крылья" },
    { cx: 0.5,  cy: 0.46, rx: 0.26, ry: 0.2,  label: "Платье" },
    { cx: 0.28, cy: 0.7,  rx: 0.2,  ry: 0.15, label: "Цветы" },
    { cx: 0.72, cy: 0.7,  rx: 0.18, ry: 0.15, label: "Эльф" },
  ],
  6: [
    { cx: 0.5,  cy: 0.15, rx: 0.25, ry: 0.14, label: "Башни" },
    { cx: 0.5,  cy: 0.42, rx: 0.32, ry: 0.22, label: "Стены" },
    { cx: 0.25, cy: 0.72, rx: 0.2,  ry: 0.16, label: "Ворота" },
    { cx: 0.75, cy: 0.7,  rx: 0.18, ry: 0.15, label: "Флаги" },
  ],
};

function getZones(pageId: number) {
  return ZONES_MAP[pageId] ?? ZONES_MAP[1];
}

function pickThreeColors(): string[] {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// ─── ZONE CANVAS ─────────────────────────────────────────────────────────────

function ZoneCanvas({
  page,
  zoneIndex,
  color,
  onZoneFilled,
  onDraw,
}: {
  page: (typeof COLORING_PAGES)[0];
  zoneIndex: number;
  color: string;
  onZoneFilled: () => void;
  onDraw: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const filledPx = useRef(0);
  const totalPx = useRef(1);
  const zoneFilled = useRef(false);
  const [splashPos, setSplashPos] = useState<{ x: number; y: number } | null>(null);
  const [splashActive, setSplashActive] = useState(false);
  const zones = getZones(page.id);
  const zone = zones[zoneIndex];

  // Load image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw dim overlay everywhere except active zone
      ctx.save();
      ctx.fillStyle = "rgba(10,5,25,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cut out active zone (ellipse)
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.ellipse(
        zone.cx * canvas.width,
        zone.cy * canvas.height,
        zone.rx * canvas.width,
        zone.ry * canvas.height,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // Estimate zone pixels
      totalPx.current = Math.round(
        Math.PI * zone.rx * canvas.width * zone.ry * canvas.height
      );
      filledPx.current = 0;
      zoneFilled.current = false;
    };
    img.src = page.image;
  }, [page, zoneIndex, zone]);

  const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const insideZone = (x: number, y: number, w: number, h: number) => {
    const dx = (x - zone.cx * w) / (zone.rx * w);
    const dy = (y - zone.cy * h) / (zone.ry * h);
    return dx * dx + dy * dy <= 1;
  };

  const paintCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawing.current || zoneFilled.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      if (!insideZone(x, y, canvas.width, canvas.height)) return;

      const brushR = 22 * scaleX;
      const { r, g, b } = hexToRgb(color);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
      ctx.beginPath();
      ctx.arc(x, y, brushR, 0, Math.PI * 2);
      ctx.fill();

      filledPx.current = Math.min(filledPx.current + 800, totalPx.current);
      onDraw();

      if (filledPx.current >= totalPx.current * 0.72 && !zoneFilled.current) {
        zoneFilled.current = true;
        // Flood-fill remaining area with color for satisfying finish
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `rgba(${r},${g},${b},0.45)`;
        ctx.beginPath();
        ctx.ellipse(
          zone.cx * canvas.width,
          zone.cy * canvas.height,
          zone.rx * canvas.width,
          zone.ry * canvas.height,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        // Splash position: center of zone in canvas-display coords
        const rect2 = canvas.getBoundingClientRect();
        const displayScaleX = rect2.width / canvas.width;
        const displayScaleY = rect2.height / canvas.height;
        setSplashPos({
          x: zone.cx * canvas.width * displayScaleX,
          y: zone.cy * canvas.height * displayScaleY,
        });
        setSplashActive(true);
        setTimeout(() => setSplashActive(false), 900);
        setTimeout(onZoneFilled, 750);
      }
    },
    [color, zone, onZoneFilled, onDraw]
  );

  const paint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      paintCoords(e.clientX, e.clientY);
    },
    [paintCoords]
  );

  // Register touch events as passive to avoid scroll blocking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      isDrawing.current = true;
      if (e.cancelable) e.preventDefault();
    };
    const onTouchEnd = () => { isDrawing.current = false; };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        paintCoords(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [paintCoords]);

  return (
    <div className="relative w-full flex justify-center">
      <div className="relative" style={{ maxWidth: "100%", maxHeight: "54vh" }}>
        <canvas
          ref={canvasRef}
          className="canvas-glow rounded-2xl cursor-crosshair touch-none block"
          style={{ maxWidth: "100%", maxHeight: "54vh", touchAction: "none" }}
          onMouseDown={() => (isDrawing.current = true)}
          onMouseUp={() => (isDrawing.current = false)}
          onMouseLeave={() => (isDrawing.current = false)}
          onMouseMove={paint}
        />
        {splashPos && (
          <PaintSplash
            x={splashPos.x}
            y={splashPos.y}
            color={color}
            active={splashActive}
          />
        )}
      </div>
      {/* Zone label hint */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/70 backdrop-blur-sm px-3 py-1 rounded-full font-body text-xs text-primary border border-primary/30">
        ✏️ Раскрась: <strong>{zone.label}</strong>
      </div>
    </div>
  );
}

// ─── PAINT SPLASH ────────────────────────────────────────────────────────────

interface SplashParticle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  dur: number;
  color: string;
  delay: number;
}

function PaintSplash({ x, y, color, active }: { x: number; y: number; color: string; active: boolean }) {
  if (!active) return null;

  const particles: SplashParticle[] = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const dist = 40 + Math.random() * 90;
    const size = 6 + Math.random() * 14;
    // slight color variation
    const variants = [color, color + "cc", color + "99"];
    return {
      id: i,
      x, y,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      size,
      dur: 0.5 + Math.random() * 0.35,
      color: variants[i % variants.length],
      delay: Math.random() * 0.08,
    };
  });

  // Extra big blobs
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 5) * Math.PI * 2;
    const dist = 20 + Math.random() * 40;
    return {
      id: i,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      size: 18 + Math.random() * 20,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" style={{ zIndex: 20 }}>
      {/* Center burst ring */}
      <div
        className="splash-ring"
        style={{
          left: x,
          top: y,
          width: 60,
          height: 60,
          borderColor: color,
          borderWidth: 4,
          marginLeft: -30,
          marginTop: -30,
        } as React.CSSProperties}
      />
      <div
        className="splash-ring"
        style={{
          left: x,
          top: y,
          width: 100,
          height: 100,
          borderColor: color + "88",
          borderWidth: 3,
          marginLeft: -50,
          marginTop: -50,
          animationDelay: "0.08s",
        } as React.CSSProperties}
      />

      {/* Blob splashes */}
      {blobs.map((b) => (
        <div
          key={b.id}
          className="splash-blob"
          style={{
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            backgroundColor: color + "dd",
            animationDelay: `${b.id * 0.04}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Flying particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="splash-particle"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            "--dur": `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── SOUND WAVE ──────────────────────────────────────────────────────────────

function SoundWave({ active }: { active: boolean }) {
  return (
    <div className="sound-wave flex items-end gap-0.5 h-5">
      {[1, 0.6, 1, 0.7, 1, 0.5, 1].map((h, i) => (
        <span
          key={i}
          style={{
            height: `${h * 100}%`,
            "--d": "0.8s",
            "--delay": `${i * 0.1}s`,
            opacity: active ? 1 : 0.3,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── COLOR CHOICE PANEL ──────────────────────────────────────────────────────

function ColorChoicePanel({
  colors,
  chosen,
  onChoose,
  zoneLabel,
}: {
  colors: string[];
  chosen: string | null;
  onChoose: (c: string) => void;
  zoneLabel: string;
}) {
  return (
    <div className="px-6 pt-5 pb-4 flex flex-col items-center gap-4">
      <p className="font-body text-sm text-muted-foreground text-center">
        Выбери цвет для <span className="text-foreground font-semibold">«{zoneLabel}»</span>
      </p>
      <div className="flex gap-5 justify-center">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onChoose(c)}
            className={`relative transition-all duration-200 rounded-full
              ${chosen === c
                ? "w-16 h-16 border-4 border-white glow-gold scale-110"
                : "w-14 h-14 border-2 border-transparent hover:scale-105 opacity-80 hover:opacity-100"
              }`}
            style={{ backgroundColor: c, boxShadow: chosen === c ? `0 0 24px ${c}` : `0 0 8px ${c}88` }}
          >
            {chosen === c && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs text-green-600 font-bold shadow">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ZONE DONE OVERLAY ───────────────────────────────────────────────────────

function ZoneDoneOverlay({ label, onNext, isLast }: { label: string; onNext: () => void; isLast: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center pb-16 pointer-events-none">
      <div className="pointer-events-auto magic-card rounded-3xl px-8 py-5 text-center glow-gold animate-scale-in mx-4 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full achievement-badge flex items-center justify-center text-3xl shadow-lg">✓</div>
        <div>
          <p className="font-display text-xl font-bold text-primary">«{label}» раскрашена!</p>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            {isLast ? "Последняя часть — финал близко!" : "Отлично! Переходим к следующей части"}
          </p>
        </div>
        <button
          onClick={onNext}
          className="mt-1 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:brightness-110 transition-all"
        >
          {isLast ? "Завершить 🎉" : "Дальше →"}
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN: COLORING ────────────────────────────────────────────────────────

function ColoringScreen({
  page,
  pageProgress,
  onComplete,
}: {
  page: (typeof COLORING_PAGES)[0];
  pageProgress: { completed: boolean; stars: number };
  onComplete: (stars: number) => void;
}) {
  const zones = getZones(page.id);
  const totalZones = zones.length;

  // phase: "choose" | "painting" | "zone_done" | "complete"
  const [phase, setPhase] = useState<"choose" | "painting" | "zone_done" | "complete">("choose");
  const [zoneIndex, setZoneIndex] = useState(0);
  const [threeColors, setThreeColors] = useState<string[]>(() => pickThreeColors());
  const [chosenColor, setChosenColor] = useState<string | null>(null);
  const [doneZones, setDoneZones] = useState<{ label: string; color: string }[]>([]);
  const [activeSound, setActiveSound] = useState("brush");
  const [soundOn, setSoundOn] = useState(true);
  const [showComplete, setShowComplete] = useState(false);

  const playSound = useAudio(activeSound, soundOn);

  const currentZone = zones[zoneIndex];
  const isLastZone = zoneIndex === totalZones - 1;

  // When color chosen → start painting
  const handleChooseColor = (c: string) => {
    setChosenColor(c);
    setPhase("painting");
  };

  // Zone filled by drawing
  const handleZoneFilled = () => {
    setDoneZones((prev) => [...prev, { label: currentZone.label, color: chosenColor! }]);
    setPhase("zone_done");
  };

  // Proceed to next zone or complete
  const handleNext = () => {
    if (isLastZone) {
      setShowComplete(true);
      setPhase("complete");
    } else {
      setZoneIndex((i) => i + 1);
      setThreeColors(pickThreeColors());
      setChosenColor(null);
      setPhase("choose");
    }
  };



  const progress = Math.round(((doneZones.length + (phase === "painting" ? 0.5 : 0)) / totalZones) * 100);

  return (
    <div className="relative z-10 flex flex-col h-full">
      {/* Already done badge */}
      {pageProgress.completed && phase !== "complete" && (
        <div className="mx-4 mt-3 mb-1 rounded-xl bg-yellow-500/15 border border-yellow-500/30 px-4 py-2 flex items-center gap-2">
          <span className="text-base">⭐</span>
          <span className="font-body text-xs text-yellow-300 font-semibold">
            Уже раскрашено! Можно пройти снова и обновить рекорд
          </span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-4 pb-2 text-center">
        <h2 className="font-display text-2xl text-primary font-bold">
          {page.emoji} {page.title}
        </h2>
      </div>

      {/* Progress bar + zone dots */}
      <div className="px-6 mb-3">
        <div className="flex justify-between text-xs font-body text-muted-foreground mb-1.5">
          <span>Часть {Math.min(zoneIndex + 1, totalZones)} из {totalZones}</span>
          <span className="text-primary font-semibold">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className="h-full magic-progress rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Zone dots */}
        <div className="flex gap-2 justify-center">
          {zones.map((z, i) => {
            const isDone = i < doneZones.length;
            const isActive = i === zoneIndex;
            return (
              <div
                key={i}
                className={`flex items-center justify-center rounded-full text-xs font-body font-semibold transition-all duration-300
                  ${isDone ? "w-7 h-7 achievement-badge text-white" :
                    isActive ? "w-7 h-7 border-2 border-primary text-primary bg-primary/10" :
                    "w-6 h-6 border border-muted text-muted-foreground bg-muted/30"}`}
                style={isDone ? { boxShadow: `0 0 10px ${doneZones[i].color}88` } : {}}
              >
                {isDone ? "✓" : i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="px-4 flex-1 min-h-0">
        {phase !== "choose" && (
          <ZoneCanvas
            key={`${page.id}-${zoneIndex}`}
            page={page}
            zoneIndex={zoneIndex}
            color={chosenColor!}
            onZoneFilled={handleZoneFilled}
            onDraw={playSound}
          />
        )}
        {phase === "choose" && (
          <div className="relative w-full flex justify-center h-full items-center">
            <div className="canvas-glow rounded-2xl overflow-hidden" style={{ maxHeight: "54vh", maxWidth: "100%" }}>
              <img
                src={page.image}
                alt={page.title}
                className="object-cover w-full"
                style={{ maxHeight: "54vh", filter: "brightness(0.4) blur(1px)" }}
              />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <span className="text-4xl animate-float">🎨</span>
              <p className="font-display text-xl font-bold text-primary text-center px-6">
                Выбери цвет для<br />«{currentZone.label}»
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Color choice or sound panel */}
      {phase === "choose" && (
        <ColorChoicePanel
          colors={threeColors}
          chosen={chosenColor}
          onChoose={handleChooseColor}
          zoneLabel={currentZone.label}
        />
      )}

      {phase === "painting" && (
        <div className="px-4 pb-4 pt-3 flex items-center justify-between">
          {/* Active color swatch */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: chosenColor!, boxShadow: `0 0 12px ${chosenColor}` }}
            />
            <span className="font-body text-sm text-muted-foreground">Рисуй по зоне ✏️</span>
          </div>
          {/* Sound controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundOn(!soundOn)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-body transition-all ${soundOn ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}
            >
              {soundOn ? <SoundWave active={true} /> : <Icon name="VolumeX" size={13} />}
            </button>
            <select
              value={activeSound}
              onChange={(e) => setActiveSound(e.target.value)}
              className="bg-muted text-muted-foreground rounded-full px-2 py-1.5 text-xs font-body border border-border outline-none"
            >
              {SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Zone done overlay */}
      {phase === "zone_done" && (
        <ZoneDoneOverlay
          label={currentZone.label}
          onNext={handleNext}
          isLast={isLastZone}
        />
      )}

      {/* Complete overlay */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
          <div className="magic-card rounded-3xl p-8 text-center max-w-xs mx-4 glow-gold">
            <div className="text-6xl mb-4 animate-float">🎉</div>
            <h3 className="font-display text-3xl font-bold text-primary mb-3">Шедевр готов!</h3>
            {/* Show colored zones */}
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {doneZones.map((z, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full border-2 border-white/50" style={{ backgroundColor: z.color }} />
                  <span className="font-body text-xs text-muted-foreground">{z.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-1 mb-4">
              <span className="text-2xl">⭐</span>
              <span className="text-2xl">⭐</span>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="font-body text-muted-foreground text-sm mb-6">
              Все {totalZones} части раскрашены! +3 звезды
            </p>
            <button
              onClick={() => onComplete(3)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm hover:brightness-110 transition-all"
            >
              В каталог
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCREEN: CATALOG ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  "Все":        { emoji: "✨", color: "bg-primary text-primary-foreground" },
  "Сказочные":  { emoji: "🦄", color: "bg-purple-500/80 text-white" },
  "Машинки":    { emoji: "🏎️", color: "bg-red-500/80 text-white" },
  "Еда":        { emoji: "🍕", color: "bg-orange-500/80 text-white" },
  "Животные":   { emoji: "🐶", color: "bg-green-500/80 text-white" },
  "Растения":   { emoji: "🌿", color: "bg-teal-500/80 text-white" },
};

function CatalogScreen({
  onSelect,
  getPage,
}: {
  onSelect: (page: (typeof COLORING_PAGES)[0]) => void;
  getPage: (id: number) => { completed: boolean; stars: number };
}) {
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [difficultyFilter, setDifficultyFilter] = useState("Все");
  const [search, setSearch] = useState("");

  const categories = ["Все", "Сказочные", "Машинки", "Еда", "Животные", "Растения"];
  const difficulties = ["Все", "Легко", "Средне", "Сложно"];

  const filtered = COLORING_PAGES.filter((p) => {
    const byCategory = categoryFilter === "Все" || p.category === categoryFilter;
    const byDifficulty = difficultyFilter === "Все" || p.difficulty === difficultyFilter;
    const bySearch = search === "" || p.title.toLowerCase().includes(search.toLowerCase());
    return byCategory && byDifficulty && bySearch;
  });

  return (
    <div className="relative z-10 px-4 pt-4 pb-8">
      <div className="text-center mb-4">
        <h2 className="font-display text-3xl font-bold text-primary text-glow-gold">
          Каталог раскрасок
        </h2>
        <p className="font-body text-muted-foreground text-sm mt-1">
          {COLORING_PAGES.length} волшебных раскрасок
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="🔍 Поиск раскраски..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-muted/60 border border-border rounded-xl px-4 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body font-semibold transition-all ${active ? meta.color + " glow-gold scale-105" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`}
            >
              <span>{meta.emoji}</span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Difficulty tabs */}
      <div className="flex gap-1.5 mb-5">
        {difficulties.map((d) => (
          <button
            key={d}
            onClick={() => setDifficultyFilter(d)}
            className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-body font-medium transition-all ${difficultyFilter === d ? "bg-secondary/40 text-secondary border border-secondary/50" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}
          >
            {d === "Легко" ? "🌿" : d === "Средне" ? "⚡" : d === "Сложно" ? "💎" : "🎯"} {d}
          </button>
        ))}
        <span className="ml-auto font-body text-xs text-muted-foreground self-center flex-shrink-0">
          {filtered.length} шт.
        </span>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-body text-muted-foreground">Ничего не найдено</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((page, idx) => {
          const pg = getPage(page.id);
          return (
          <button
            key={page.id}
            onClick={() => onSelect(page)}
            className="magic-card rounded-2xl overflow-hidden text-left animate-fade-in-up"
            style={{
              animationDelay: `${Math.min(idx, 12) * 0.05}s`,
              opacity: 0,
              animationFillMode: "forwards",
            }}
          >
            <div className="relative aspect-square bg-white overflow-hidden">
              <img src={page.image} alt={page.title} className="w-full h-full object-cover" />
              {pg.completed && (
                <div className="absolute inset-0 bg-secondary/20 flex items-center justify-center">
                  <span className="text-3xl">✅</span>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-body font-semibold ${page.difficulty === "Легко" ? "bg-green-500/80 text-white" : page.difficulty === "Средне" ? "bg-yellow-500/80 text-white" : "bg-red-500/80 text-white"}`}
                >
                  {page.difficulty}
                </span>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{page.emoji}</span>
                <span className="font-body font-semibold text-foreground text-sm truncate">
                  {page.title}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-muted-foreground">{page.category}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <span
                      key={s}
                      className={`text-xs ${s <= pg.stars ? "text-yellow-400" : "text-muted"}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCREEN: ACHIEVEMENTS ────────────────────────────────────────────────────

function AchievementsScreen({ totalStars, completedCount }: { totalStars: number; completedCount: number }) {
  const maxStars = COLORING_PAGES.length * 3;

  return (
    <div className="relative z-10 px-4 pt-4 pb-8">
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl font-bold text-primary text-glow-gold">Достижения</h2>
        <p className="font-body text-muted-foreground text-sm mt-1">Твои магические победы</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Раскрашено", value: completedCount, max: COLORING_PAGES.length, emoji: "🎨" },
          { label: "Звёзды", value: totalStars, max: maxStars, emoji: "⭐" },
          {
            label: "Достижений",
            value: ACHIEVEMENTS.filter((a) => a.unlocked).length,
            max: ACHIEVEMENTS.length,
            emoji: "🏆",
          },
        ].map((stat) => (
          <div key={stat.label} className="magic-card rounded-2xl p-3 text-center">
            <div className="text-2xl mb-1">{stat.emoji}</div>
            <div className="font-display text-2xl font-bold text-primary">{stat.value}</div>
            <div className="font-body text-xs text-muted-foreground">{stat.label}</div>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full magic-progress rounded-full"
                style={{ width: `${(stat.value / stat.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <h3 className="font-display text-xl font-bold text-foreground mb-4">Все достижения</h3>
      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((ach, idx) => (
          <div
            key={ach.id}
            className={`magic-card rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up ${ach.unlocked ? "" : "achievement-locked"}`}
            style={{
              animationDelay: `${idx * 0.1}s`,
              opacity: 0,
              animationFillMode: "forwards",
            }}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${ach.unlocked ? "achievement-badge" : "bg-muted"}`}
            >
              {ach.emoji}
            </div>
            <div className="min-w-0">
              <div className="font-body font-semibold text-sm text-foreground truncate">
                {ach.title}
              </div>
              <div className="font-body text-xs text-muted-foreground leading-tight">{ach.desc}</div>
              {ach.unlocked && (
                <div className="font-body text-xs text-green-400 mt-0.5">✓ Получено</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN: SETTINGS ────────────────────────────────────────────────────────

function SettingsScreen() {
  const [soundVolume, setSoundVolume] = useState(70);
  const [musicVolume, setMusicVolume] = useState(50);
  const [difficulty, setDifficulty] = useState("Средне");
  const [haptic, setHaptic] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const difficulties = ["Легко", "Средне", "Сложно"];

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-all relative ${value ? "bg-primary" : "bg-muted"}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "left-7" : "left-1"}`}
      />
    </button>
  );

  return (
    <div className="relative z-10 px-4 pt-4 pb-8">
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl font-bold text-primary text-glow-gold">Настройки</h2>
        <p className="font-body text-muted-foreground text-sm mt-1">Настрой свой волшебный мир</p>
      </div>

      <div className="space-y-4">
        <div className="magic-card rounded-2xl p-5">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">🎵 Звук и музыка</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-body text-sm text-foreground">🖌️ Звуки раскрашивания</span>
                <span className="font-body text-sm text-primary font-semibold">{soundVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={soundVolume}
                onChange={(e) => setSoundVolume(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-body text-sm text-foreground">🎶 Фоновая музыка</span>
                <span className="font-body text-sm text-primary font-semibold">{musicVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={musicVolume}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />
            </div>
          </div>
        </div>

        <div className="magic-card rounded-2xl p-5">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">⚔️ Сложность</h3>
          <div className="grid grid-cols-3 gap-2">
            {difficulties.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-2.5 rounded-xl font-body text-sm font-semibold transition-all ${difficulty === d ? "bg-primary text-primary-foreground glow-gold" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {d === "Легко" ? "🌿" : d === "Средне" ? "⚡" : "💎"} {d}
              </button>
            ))}
          </div>
        </div>

        <div className="magic-card rounded-2xl p-5">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">⚙️ Прочее</h3>
          <div className="space-y-4">
            {[
              { label: "📳 Вибрация при касании", value: haptic, onChange: () => setHaptic(!haptic) },
              {
                label: "🔔 Уведомления",
                value: notifications,
                onChange: () => setNotifications(!notifications),
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="font-body text-sm text-foreground">{item.label}</span>
                <Toggle value={item.value} onChange={item.onChange} />
              </div>
            ))}
          </div>
        </div>

        <div className="magic-card rounded-2xl p-5">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">🌿 Природные звуки</h3>
          <div className="grid grid-cols-3 gap-2">
            {SOUNDS.map((s) => (
              <div
                key={s.id}
                className="bg-muted/50 rounded-xl p-3 text-center cursor-pointer hover:bg-muted transition-all"
              >
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="font-body text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: HOME ────────────────────────────────────────────────────────────

function HomeScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  return (
    <div className="relative z-10 px-6 pt-6 pb-8">
      <div className="text-center mb-10">
        <div className="text-7xl mb-4 animate-float inline-block">🌙</div>
        <h1 className="font-display text-4xl font-bold text-primary text-glow-gold leading-tight">
          Волшебная
          <br />
          Раскраска
        </h1>
        <p className="font-body text-muted-foreground mt-3 text-sm leading-relaxed max-w-xs mx-auto">
          Погрузись в мир магии и фантазии. Раскрашивай сказочных персонажей под расслабляющие
          звуки природы.
        </p>
      </div>

      <button
        onClick={() => onNavigate("catalog")}
        className="w-full magic-card rounded-3xl overflow-hidden mb-4 text-left group glow-purple"
      >
        <div className="relative h-44 bg-white overflow-hidden">
          <img
            src={COLORING_PAGES[0].image}
            alt="Раскраска"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <span className="font-body text-xs bg-secondary/80 text-white px-2 py-1 rounded-full">
              ✨ Новое
            </span>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">
              Начать раскрашивать
            </h3>
            <p className="font-body text-sm text-muted-foreground">
              {COLORING_PAGES.length} волшебных раскрасок · 6 тем
            </p>
          </div>
          <Icon name="ChevronRight" size={20} className="text-primary" />
        </div>
      </button>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { emoji: "🎨", label: "Каталог", desc: `${COLORING_PAGES.length} раскрасок`, screen: "catalog" },
          { emoji: "🏆", label: "Награды", desc: "2 разблокировано", screen: "achievements" },
          { emoji: "⚙️", label: "Настройки", desc: "Звук и сложность", screen: "settings" },
        ].map((item) => (
          <button
            key={item.screen}
            onClick={() => onNavigate(item.screen)}
            className="magic-card rounded-2xl p-3 text-center"
          >
            <div className="text-2xl mb-1">{item.emoji}</div>
            <div className="font-body font-semibold text-foreground text-xs">{item.label}</div>
            <div className="font-body text-muted-foreground text-xs mt-0.5 leading-tight">
              {item.desc}
            </div>
          </button>
        ))}
      </div>

      <div className="magic-card rounded-2xl p-4">
        <h3 className="font-display text-base font-bold text-foreground mb-3">
          Последние раскраски
        </h3>
        <div className="space-y-2">
          {COLORING_PAGES.slice(0, 3).map((page) => (
            <button
              key={page.id}
              onClick={() => onNavigate("catalog")}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex-shrink-0">
                <img src={page.image} alt={page.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-body text-sm font-semibold text-foreground truncate">
                  {page.emoji} {page.title}
                </div>
                <div className="font-body text-xs text-muted-foreground">{page.category}</div>
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={`text-xs ${s <= page.stars ? "text-yellow-400" : "text-muted"}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────

function BottomNav({
  screen,
  onNavigate,
}: {
  screen: string;
  onNavigate: (s: string) => void;
}) {
  const items = [
    { id: "home", emoji: "🏠", label: "Главная" },
    { id: "catalog", emoji: "📚", label: "Каталог" },
    { id: "achievements", emoji: "🏆", label: "Награды" },
    { id: "settings", emoji: "⚙️", label: "Настройки" },
  ];

  return (
    <nav className="relative z-10 flex border-t border-border/50 bg-background/80 backdrop-blur-sm">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all relative ${screen === item.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <span className="text-xl">{item.emoji}</span>
          <span className={`font-body text-xs ${screen === item.id ? "font-semibold" : ""}`}>
            {item.label}
          </span>
          {screen === item.id && (
            <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
    </nav>
  );
}

// ─── OFFLINE BANNER ──────────────────────────────────────────────────────────

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

function OfflineBanner() {
  const online = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Show banner when going offline, hide 2s after coming back
  useEffect(() => {
    if (!online) {
      setDismissed(false);
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[90] flex justify-center pointer-events-none"
      style={{ animation: 'fadeInUp 0.35s ease-out' }}
    >
      <div
        className={`pointer-events-auto mx-4 mt-3 max-w-sm w-full rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl transition-all duration-500
          ${online
            ? 'bg-green-900/90 border border-green-500/40'
            : 'bg-background/95 border border-destructive/40 backdrop-blur-md'}`}
        style={{ boxShadow: online ? '0 0 20px rgba(34,197,94,0.3)' : '0 0 20px rgba(239,68,68,0.2)' }}
      >
        {/* Icon */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg
          ${online ? 'bg-green-500/20' : 'bg-destructive/15'}`}>
          {online ? '✅' : '🦉'}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`font-body font-semibold text-sm ${online ? 'text-green-300' : 'text-foreground'}`}>
            {online ? 'Соединение восстановлено!' : 'Нет интернета'}
          </p>
          <p className="font-body text-xs text-muted-foreground leading-tight mt-0.5">
            {online
              ? 'Игра работает в полном режиме'
              : 'Сова не переживает — раскраски работают офлайн 🎨'}
          </p>
        </div>

        {/* Dismiss (offline only) */}
        {!online && !dismissed && (
          <button
            onClick={() => { setDismissed(true); setVisible(false); }}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm font-bold"
          >
            ×
          </button>
        )}

        {/* Progress bar (online — auto disappear) */}
        {online && (
          <div className="absolute bottom-0 left-0 h-0.5 bg-green-400 rounded-full"
            style={{ animation: 'progress-shrink 2s linear forwards' }}
          />
        )}
      </div>
    </div>
  );
}

// ─── SPLASH SCREEN ───────────────────────────────────────────────────────────

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 2000);
    const t3 = setTimeout(() => onDone(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[100] magic-bg flex flex-col items-center justify-center"
      style={{
        transition: "opacity 0.5s ease",
        opacity: phase === "out" ? 0 : 1,
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      <StarsBackground />

      {/* Owl icon */}
      <div
        className="relative mb-6"
        style={{
          transition: "transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease",
          transform: phase === "in" ? "scale(0.5) translateY(30px)" : "scale(1) translateY(0)",
          opacity: phase === "in" ? 0 : 1,
        }}
      >
        <div className="w-36 h-36 rounded-[2.5rem] overflow-hidden glow-purple shadow-2xl border-2 border-primary/30">
          <img
            src="https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/64b2263d-4846-440c-b045-a5ea54535907.jpg"
            alt="Раскраска для детей"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Sparkles around icon */}
        {["✨","⭐","💫","🌟"].map((s, i) => (
          <span
            key={i}
            className="absolute text-lg animate-sparkle"
            style={{
              top: `${[-10, 10, -5, 70][i]}%`,
              left: `${[-15, 85, 90, -10][i]}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          >{s}</span>
        ))}
      </div>

      {/* Title */}
      <div
        style={{
          transition: "transform 0.6s ease 0.2s, opacity 0.5s ease 0.2s",
          transform: phase === "in" ? "translateY(20px)" : "translateY(0)",
          opacity: phase === "in" ? 0 : 1,
        }}
        className="text-center px-8"
      >
        <h1 className="font-display text-4xl font-bold text-primary text-glow-gold leading-tight mb-2">
          Раскраска<br />для детей
        </h1>
        <p className="font-body text-muted-foreground text-sm">
          🦉 112 волшебных раскрасок
        </p>
      </div>

      {/* Loading dots */}
      <div
        className="flex gap-2 mt-10"
        style={{
          transition: "opacity 0.4s ease 0.4s",
          opacity: phase === "in" ? 0 : 1,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState("home");
  const [coloringPage, setColoringPage] = useState<(typeof COLORING_PAGES)[0] | null>(null);
  const { markComplete, getPage, totalStars, completedCount } = useProgress();

  // Register Service Worker for offline support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* sw not critical */ });
    }
  }, []);

  const handleNavigate = (s: string) => {
    setScreen(s);
    if (s !== "coloring") setColoringPage(null);
  };

  const handleSelectPage = (page: (typeof COLORING_PAGES)[0]) => {
    setColoringPage(page);
    setScreen("coloring");
  };

  const handleBack = () => {
    if (screen === "coloring") {
      setScreen("catalog");
      setColoringPage(null);
    } else {
      setScreen("home");
    }
  };

  const handleComplete = (stars: number) => {
    if (coloringPage) markComplete(coloringPage.id, stars);
    handleNavigate("catalog");
  };

  return (
    <div className="magic-bg min-h-screen flex flex-col relative overflow-hidden">
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <OfflineBanner />

      <StarsBackground />
      <FloatingParticles />

      <div className="relative z-10 flex flex-col h-screen max-w-sm mx-auto w-full">
        <Header screen={screen} onBack={handleBack} totalStars={totalStars} />

        <main className="flex-1 overflow-y-auto">
          {screen === "home" && <HomeScreen onNavigate={handleNavigate} />}
          {screen === "catalog" && <CatalogScreen onSelect={handleSelectPage} getPage={getPage} />}
          {screen === "coloring" && coloringPage && (
            <ColoringScreen
              page={coloringPage}
              pageProgress={getPage(coloringPage.id)}
              onComplete={handleComplete}
            />
          )}
          {screen === "achievements" && <AchievementsScreen totalStars={totalStars} completedCount={completedCount} />}
          {screen === "settings" && <SettingsScreen />}
        </main>

        {screen !== "coloring" && (
          <BottomNav screen={screen} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  );
}