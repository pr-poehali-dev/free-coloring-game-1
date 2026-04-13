import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── DATA ────────────────────────────────────────────────────────────────────

const COLORING_PAGES = [
  {
    id: 1,
    title: "Единорог в лесу",
    category: "Природа",
    difficulty: "Легко",
    emoji: "🦄",
    image: "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/67cef695-d5ed-4ae4-87a9-bb6458486857.jpg",
    completed: false,
    stars: 0,
  },
  {
    id: 2,
    title: "Дракон и замок",
    category: "Приключения",
    difficulty: "Средне",
    emoji: "🐉",
    image: "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/2c1adf01-02de-41a1-815f-83fe5e70e9d6.jpg",
    completed: true,
    stars: 3,
  },
  {
    id: 3,
    title: "Русалочка",
    category: "Море",
    difficulty: "Средне",
    emoji: "🧜‍♀️",
    image: "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/ffb99e1f-164d-47a9-a26e-e94459e5a4f5.jpg",
    completed: false,
    stars: 0,
  },
  {
    id: 4,
    title: "Ведьма на метле",
    category: "Магия",
    difficulty: "Сложно",
    emoji: "🧙‍♀️",
    image: "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/3c8c36e3-ce7a-4a1f-8ead-539a73517fdf.jpg",
    completed: false,
    stars: 0,
  },
  {
    id: 5,
    title: "Феи и эльфы",
    category: "Волшебство",
    difficulty: "Легко",
    emoji: "🧚",
    image: "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/67cef695-d5ed-4ae4-87a9-bb6458486857.jpg",
    completed: false,
    stars: 0,
  },
  {
    id: 6,
    title: "Волшебный замок",
    category: "Архитектура",
    difficulty: "Сложно",
    emoji: "🏰",
    image: "https://cdn.poehali.dev/projects/e71a5a9e-694c-4ce2-8174-80b79757a686/files/2c1adf01-02de-41a1-815f-83fe5e70e9d6.jpg",
    completed: false,
    stars: 0,
  },
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

// ─── CANVAS COLORING ─────────────────────────────────────────────────────────

function ColoringCanvas({
  page,
  selectedColor,
  brushSize,
  onProgress,
}: {
  page: (typeof COLORING_PAGES)[0];
  selectedColor: string;
  brushSize: number;
  onProgress: (p: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const coloredArea = useRef(0);

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
    };
    img.src = page.image;
  }, [page]);

  const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const paint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      const { r, g, b } = hexToRgb(selectedColor);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
      ctx.beginPath();
      ctx.arc(x, y, brushSize * scaleX, 0, Math.PI * 2);
      ctx.fill();

      coloredArea.current = Math.min(coloredArea.current + brushSize * 8, 10000);
      onProgress(Math.min(Math.round((coloredArea.current / 10000) * 100), 100));
    },
    [selectedColor, brushSize, onProgress]
  );

  return (
    <div className="relative w-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="canvas-glow rounded-2xl cursor-crosshair touch-none"
        style={{ maxWidth: "100%", maxHeight: "60vh" }}
        onMouseDown={() => (isDrawing.current = true)}
        onMouseUp={() => (isDrawing.current = false)}
        onMouseLeave={() => (isDrawing.current = false)}
        onMouseMove={paint}
        onTouchStart={() => (isDrawing.current = true)}
        onTouchEnd={() => (isDrawing.current = false)}
        onTouchMove={paint}
      />
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

// ─── SCREEN: COLORING ────────────────────────────────────────────────────────

function ColoringScreen({
  page,
  onComplete,
}: {
  page: (typeof COLORING_PAGES)[0];
  onComplete: () => void;
}) {
  const [selectedColor, setSelectedColor] = useState("#FF6B9D");
  const [brushSize, setBrushSize] = useState(15);
  const [progress, setProgress] = useState(0);
  const [activeSound, setActiveSound] = useState("brush");
  const [soundOn, setSoundOn] = useState(true);
  const [showComplete, setShowComplete] = useState(false);

  const handleProgress = (p: number) => {
    setProgress(p);
    if (p >= 80 && !showComplete) setShowComplete(true);
  };

  return (
    <div className="relative z-10 flex flex-col h-full">
      <div className="px-6 pt-4 pb-3 text-center">
        <h2 className="font-display text-2xl text-primary font-bold">
          {page.emoji} {page.title}
        </h2>
        <span className="text-muted-foreground font-body text-sm">
          {page.category} · {page.difficulty}
        </span>
      </div>

      <div className="px-6 mb-4">
        <div className="flex justify-between text-xs font-body text-muted-foreground mb-1.5">
          <span>Прогресс раскраски</span>
          <span className="text-primary font-semibold">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full magic-progress rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="px-4 flex-1 min-h-0">
        <ColoringCanvas
          page={page}
          selectedColor={selectedColor}
          brushSize={brushSize}
          onProgress={handleProgress}
        />
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`color-btn w-8 h-8 rounded-full border-2 ${selectedColor === color ? "active border-white" : "border-transparent"}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Icon name="Circle" size={10} className="text-muted-foreground" />
          <input
            type="range"
            min={5}
            max={40}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 accent-yellow-400"
          />
          <Icon name="Circle" size={18} className="text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body transition-all ${soundOn ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}
          >
            {soundOn ? <SoundWave active={soundOn} /> : <Icon name="VolumeX" size={14} />}
          </button>
          {SOUNDS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSound(s.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-body transition-all ${activeSound === s.id ? "bg-secondary/30 text-secondary border border-secondary/40" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-scale-in">
          <div className="magic-card rounded-3xl p-8 text-center max-w-xs mx-4 glow-gold">
            <div className="text-6xl mb-4 animate-float">🎉</div>
            <h3 className="font-display text-3xl font-bold text-primary mb-2">Великолепно!</h3>
            <div className="flex justify-center gap-1 mb-4">
              <span className="text-2xl">⭐</span>
              <span className="text-2xl">⭐</span>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="font-body text-muted-foreground text-sm mb-6">
              Ты получила 3 звезды и открыла достижение!
            </p>
            <button
              onClick={onComplete}
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

function CatalogScreen({
  onSelect,
}: {
  onSelect: (page: (typeof COLORING_PAGES)[0]) => void;
}) {
  const [filter, setFilter] = useState("Все");
  const categories = ["Все", "Легко", "Средне", "Сложно"];
  const filtered =
    filter === "Все" ? COLORING_PAGES : COLORING_PAGES.filter((p) => p.difficulty === filter);

  return (
    <div className="relative z-10 px-4 pt-4 pb-8">
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl font-bold text-primary text-glow-gold">
          Каталог раскрасок
        </h2>
        <p className="font-body text-muted-foreground text-sm mt-1">
          Выбери свой волшебный мир
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-body font-medium transition-all ${filter === cat ? "bg-primary text-primary-foreground glow-gold" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((page, idx) => (
          <button
            key={page.id}
            onClick={() => onSelect(page)}
            className="magic-card rounded-2xl overflow-hidden text-left animate-fade-in-up"
            style={{
              animationDelay: `${idx * 0.08}s`,
              opacity: 0,
              animationFillMode: "forwards",
            }}
          >
            <div className="relative aspect-square bg-white overflow-hidden">
              <img src={page.image} alt={page.title} className="w-full h-full object-cover" />
              {page.completed && (
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
                      className={`text-xs ${s <= page.stars ? "text-yellow-400" : "text-muted"}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN: ACHIEVEMENTS ────────────────────────────────────────────────────

function AchievementsScreen({ totalStars }: { totalStars: number }) {
  const completedCount = COLORING_PAGES.filter((p) => p.completed).length;
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
              {COLORING_PAGES.length} волшебных раскрасок
            </p>
          </div>
          <Icon name="ChevronRight" size={20} className="text-primary" />
        </div>
      </button>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { emoji: "🎨", label: "Каталог", desc: `${COLORING_PAGES.length} картин`, screen: "catalog" },
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

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const [screen, setScreen] = useState("home");
  const [coloringPage, setColoringPage] = useState<(typeof COLORING_PAGES)[0] | null>(null);
  const totalStars = COLORING_PAGES.reduce((acc, p) => acc + p.stars, 0) + 3;

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

  return (
    <div className="magic-bg min-h-screen flex flex-col relative overflow-hidden">
      <StarsBackground />
      <FloatingParticles />

      <div className="relative z-10 flex flex-col h-screen max-w-sm mx-auto w-full">
        <Header screen={screen} onBack={handleBack} totalStars={totalStars} />

        <main className="flex-1 overflow-y-auto">
          {screen === "home" && <HomeScreen onNavigate={handleNavigate} />}
          {screen === "catalog" && <CatalogScreen onSelect={handleSelectPage} />}
          {screen === "coloring" && coloringPage && (
            <ColoringScreen page={coloringPage} onComplete={() => handleNavigate("catalog")} />
          )}
          {screen === "achievements" && <AchievementsScreen totalStars={totalStars} />}
          {screen === "settings" && <SettingsScreen />}
        </main>

        {screen !== "coloring" && (
          <BottomNav screen={screen} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  );
}
