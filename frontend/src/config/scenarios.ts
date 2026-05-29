export interface ScenarioConfig {
  id: string
  icon: string
  title: string
  subtitle: string
  keywords: string[]
}

const CAT_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'coat-health',
    icon: '✨',
    title: '美毛亮毛',
    subtitle: '鱼油 / 美毛粮',
    keywords: ['鱼油', '卵磷脂', '美毛粮'],
  },
  {
    id: 'digestive-care',
    icon: '🫀',
    title: '肠胃敏感',
    subtitle: '益生菌 / 低敏粮',
    keywords: ['益生菌', '低敏粮', '肠胃'],
  },
  {
    id: 'kitten-growth',
    icon: '🍼',
    title: '幼猫成长',
    subtitle: '幼猫粮 / 营养膏',
    keywords: ['幼猫粮', '营养膏', '成长'],
  },
  {
    id: 'stock-up',
    icon: '📦',
    title: '囤货专区',
    subtitle: '大包装 / 套装',
    keywords: ['大包装', '套装', '囤货'],
  },
  {
    id: 'picky-eater',
    icon: '🍖',
    title: '挑食改善',
    subtitle: '冻干 / 零食',
    keywords: ['冻干', '零食', '挑食'],
  },
  {
    id: 'seasonal-care',
    icon: '🍂',
    title: '换季护理',
    subtitle: '化毛 / 护理',
    keywords: ['化毛', '护理', '换季'],
  },
]

const PET_TYPE_LABELS: Record<string, string> = {
  cat: '猫',
  dog: '狗',
  bird: '鸟',
  fish: '鱼',
  reptile: '爬宠',
  small_pet: '小宠',
}

function replaceKeywords(scenarios: ScenarioConfig[], petType: string): ScenarioConfig[] {
  const label = PET_TYPE_LABELS[petType] || '宠物'
  return scenarios.map((s) => ({
    ...s,
    title: s.title.replace(/猫/g, label),
    subtitle: s.subtitle.replace(/猫/g, label),
    keywords: s.keywords.map((k) => k.replace(/猫/g, label)),
  }))
}

export function getScenariosByPetType(petType: string): ScenarioConfig[] {
  if (petType === 'cat') {
    return CAT_SCENARIOS
  }
  if (['dog', 'bird', 'fish', 'reptile', 'small_pet'].includes(petType)) {
    return replaceKeywords(CAT_SCENARIOS, petType)
  }
  return []
}
