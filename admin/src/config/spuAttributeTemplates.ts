export type SpuAttributeKind = 'food' | 'supplement' | 'vaccine' | 'dewormer' | 'litter' | 'generic'

export interface SpuAttributeField {
  key: string
  label: string
  placeholder?: string
  multiline?: boolean
}

export interface SpuAttributeSection {
  title: string
  fields: SpuAttributeField[]
}

export interface SpuAttributeTemplate {
  kind: SpuAttributeKind
  label: string
  sections: SpuAttributeSection[]
  medicalNotice?: boolean
}

const TEMPLATES: Record<Exclude<SpuAttributeKind, 'food' | 'generic'>, SpuAttributeTemplate> = {
  supplement: {
    kind: 'supplement',
    label: '营养补充',
    sections: [
      {
        title: '功效与适用',
        fields: [
          { key: 'suitable_issues', label: '适用问题', placeholder: '如：肠胃敏感、毛发干枯、关节养护', multiline: true },
          { key: 'main_benefits', label: '主要功效', placeholder: '如：补充益生菌、维护皮肤屏障', multiline: true },
          { key: 'applicable_stage', label: '适用阶段', placeholder: '如：幼猫、成猫、老年猫' },
        ],
      },
      {
        title: '核心成分',
        fields: [{ key: 'core_ingredients', label: '核心成分', placeholder: '如：益生菌、鱼油、软骨素', multiline: true }],
      },
      {
        title: '使用注意',
        fields: [
          { key: 'usage_method', label: '喂食/使用方式', placeholder: '如：每日随餐喂食，按体重调整', multiline: true },
          { key: 'precautions', label: '注意事项', placeholder: '如：特殊疾病或用药期先咨询兽医', multiline: true },
        ],
      },
    ],
  },
  vaccine: {
    kind: 'vaccine',
    label: '疫苗',
    medicalNotice: true,
    sections: [
      {
        title: '免疫信息',
        fields: [
          { key: 'vaccine_type', label: '疫苗类型', placeholder: '如：猫三联、狂犬疫苗' },
          { key: 'applicable_age', label: '适用年龄', placeholder: '如：8周龄以上' },
          { key: 'schedule', label: '免疫周期', placeholder: '如：首免间隔3-4周，之后按兽医建议加强', multiline: true },
        ],
      },
      {
        title: '预防疾病',
        fields: [{ key: 'target_diseases', label: '预防疾病', placeholder: '如：猫瘟、猫杯状、猫鼻支', multiline: true }],
      },
      {
        title: '接种注意',
        fields: [
          { key: 'precautions', label: '接种前后注意', placeholder: '如：健康状态下接种，接种后观察精神食欲', multiline: true },
          { key: 'contraindications', label: '禁忌', placeholder: '如：发热、急病期、严重过敏史需咨询兽医', multiline: true },
        ],
      },
    ],
  },
  dewormer: {
    kind: 'dewormer',
    label: '驱虫',
    medicalNotice: true,
    sections: [
      {
        title: '驱虫范围',
        fields: [
          { key: 'active_ingredient', label: '有效成分', placeholder: '如：塞拉菌素、非泼罗尼' },
          { key: 'parasite_targets', label: '驱虫范围', placeholder: '如：跳蚤、蜱虫、蛔虫、耳螨', multiline: true },
        ],
      },
      {
        title: '使用方式',
        fields: [
          { key: 'dosage_form', label: '剂型', placeholder: '如：滴剂、片剂、喷剂' },
          { key: 'weight_range', label: '适用体重', placeholder: '如：2.5kg以下、2.5-7.5kg' },
          { key: 'frequency', label: '使用频率', placeholder: '如：每月一次或按说明书/兽医建议', multiline: true },
        ],
      },
      {
        title: '禁忌提示',
        fields: [{ key: 'contraindications', label: '禁忌', placeholder: '如：幼龄、孕期、病弱宠物慎用', multiline: true }],
      },
    ],
  },
  litter: {
    kind: 'litter',
    label: '猫砂',
    sections: [
      {
        title: '材质与规格',
        fields: [
          { key: 'material', label: '猫砂材质', placeholder: '如：豆腐砂、膨润土、混合砂' },
          { key: 'package_spec', label: '单包规格', placeholder: '如：2.5kg/袋、6L/袋' },
        ],
      },
      {
        title: '使用体验',
        fields: [
          { key: 'clumping', label: '结团性', placeholder: '如：结团快、不易散' },
          { key: 'odor_control', label: '除臭能力', placeholder: '如：活性炭除臭、淡香' },
          { key: 'dust_level', label: '粉尘情况', placeholder: '如：低粉尘、粉尘较少' },
        ],
      },
      {
        title: '适用场景',
        fields: [{ key: 'suitable_scene', label: '适用场景', placeholder: '如：多猫家庭、封闭式猫砂盆', multiline: true }],
      },
    ],
  },
}

export const FOOD_TEMPLATE: SpuAttributeTemplate = {
  kind: 'food',
  label: '食品',
  sections: [],
}

export const GENERIC_TEMPLATE: SpuAttributeTemplate = {
  kind: 'generic',
  label: '通用',
  sections: [{ title: '产品参数', fields: [] }],
}

export function getSpuAttributeTemplate(categoryName?: string | null): SpuAttributeTemplate {
  const name = categoryName || ''
  if (/疫苗|免疫/.test(name)) return TEMPLATES.vaccine
  if (/驱虫/.test(name)) return TEMPLATES.dewormer
  if (/营养|保健|补充/.test(name)) return TEMPLATES.supplement
  if (/猫砂|豆腐砂|膨润土|混合砂|矿砂|木砂/.test(name)) return TEMPLATES.litter
  if (/粮|湿粮|干粮|处方粮|零食|冻干|猫条|罐头|肉干|肉粒|化毛|猫草/.test(name)) return FOOD_TEMPLATE
  return GENERIC_TEMPLATE
}

export function getTemplateFieldKeys(template: SpuAttributeTemplate): Set<string> {
  return new Set(template.sections.flatMap(section => section.fields.map(field => field.key)))
}

export function formatAttributeValue(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join('、')
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).join('、')
  return value === undefined || value === null ? '' : String(value)
}
