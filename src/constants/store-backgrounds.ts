/**
 * 매장 배경 커스터마이징 옵션 상수
 */

// 색상 옵션 타입
export interface ColorOption {
  id: string;
  label: string;
  from: string;
  to: string;
}

// 패턴 옵션 타입
export interface PatternOption {
  id: string;
  label: string;
}

// 프리셋 배경 타입
export interface PresetBackground {
  id: string;
  label: string;
  thumbnail: string; // 미리보기용 그라디언트 또는 색상
  style: {
    from: string;
    via?: string;
    to: string;
    pattern?: string;
  };
}

/**
 * 색상 팔레트 (8가지)
 */
export const COLOR_OPTIONS: ColorOption[] = [
  { id: 'gold', label: '골드', from: '#FEF9E7', to: '#F5E6B3' },
  { id: 'blue', label: '블루', from: '#EBF5FF', to: '#BFDBFE' },
  { id: 'green', label: '그린', from: '#ECFDF5', to: '#A7F3D0' },
  { id: 'pink', label: '핑크', from: '#FDF2F8', to: '#FBCFE8' },
  { id: 'purple', label: '퍼플', from: '#F5F3FF', to: '#DDD6FE' },
  { id: 'orange', label: '오렌지', from: '#FFF7ED', to: '#FED7AA' },
  { id: 'gray', label: '그레이', from: '#F9FAFB', to: '#E5E7EB' },
  { id: 'dark', label: '다크', from: '#1F2937', to: '#374151' },
];

/**
 * 패턴 옵션 (5가지)
 */
export const PATTERN_OPTIONS: PatternOption[] = [
  { id: 'none', label: '없음' },
  { id: 'dots', label: '도트' },
  { id: 'grid', label: '그리드' },
  { id: 'waves', label: '웨이브' },
  { id: 'diagonal', label: '대각선' },
];

/**
 * 프리셋 배경 (6가지 - 인기 조합)
 */
export const PRESET_BACKGROUNDS: PresetBackground[] = [
  {
    id: 'default',
    label: '기본',
    thumbnail: 'linear-gradient(135deg, #F9FAFB, #FEF9E7)',
    style: {
      from: '#F9FAFB',
      via: '#F3F4F6',
      to: '#FEF9E7',
      pattern: 'dots',
    },
  },
  {
    id: 'gold-luxury',
    label: '골드 럭셔리',
    thumbnail: 'linear-gradient(135deg, #FEF9E7, #F5E6B3)',
    style: {
      from: '#FEF9E7',
      via: '#FAF4DC',
      to: '#F5E6B3',
      pattern: 'dots',
    },
  },
  {
    id: 'ocean-breeze',
    label: '오션 브리즈',
    thumbnail: 'linear-gradient(135deg, #EBF5FF, #BFDBFE)',
    style: {
      from: '#EBF5FF',
      via: '#DBEAFE',
      to: '#BFDBFE',
      pattern: 'waves',
    },
  },
  {
    id: 'forest-fresh',
    label: '포레스트',
    thumbnail: 'linear-gradient(135deg, #ECFDF5, #A7F3D0)',
    style: {
      from: '#ECFDF5',
      via: '#D1FAE5',
      to: '#A7F3D0',
      pattern: 'none',
    },
  },
  {
    id: 'sunset-glow',
    label: '선셋 글로우',
    thumbnail: 'linear-gradient(135deg, #FFF7ED, #FECACA)',
    style: {
      from: '#FFF7ED',
      via: '#FED7AA',
      to: '#FECACA',
      pattern: 'none',
    },
  },
  {
    id: 'midnight',
    label: '미드나잇',
    thumbnail: 'linear-gradient(135deg, #1F2937, #374151)',
    style: {
      from: '#1F2937',
      via: '#374151',
      to: '#4B5563',
      pattern: 'grid',
    },
  },
];

/**
 * 기본 배경 설정
 */
export const DEFAULT_BACKGROUND = PRESET_BACKGROUNDS[0];

/**
 * 색상 ID로 색상 옵션 찾기
 */
export function getColorById(id: string): ColorOption | undefined {
  return COLOR_OPTIONS.find((color) => color.id === id);
}

/**
 * 패턴 ID로 패턴 옵션 찾기
 */
export function getPatternById(id: string): PatternOption | undefined {
  return PATTERN_OPTIONS.find((pattern) => pattern.id === id);
}

/**
 * 프리셋 ID로 프리셋 배경 찾기
 */
export function getPresetById(id: string): PresetBackground | undefined {
  return PRESET_BACKGROUNDS.find((preset) => preset.id === id);
}
