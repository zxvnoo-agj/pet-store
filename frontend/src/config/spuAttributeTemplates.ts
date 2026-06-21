export type SpuAttributeKind = 'food' | 'supplement' | 'vaccine' | 'dewormer' | 'litter' | 'generic'

export interface SpuAttributeField {
  key: string
  label: string
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
          { key: 'suitable_issues', label: '适用问题', multiline: true },
          { key: 'main_benefits', label: '主要功效', multiline: true },
          { key: 'applicable_stage', label: '适用阶段' },
        ],
      },
      {
        title: '核心成分',
        fields: [{ key: 'core_ingredients', label: '核心成分', multiline: true }],
      },
      {
        title: '使用注意',
        fields: [
          { key: 'usage_method', label: '喂食/使用方式', multiline: true },
          { key: 'precautions', label: '注意事项', multiline: true },
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
          { key: 'vaccine_type', label: '疫苗类型' },
          { key: 'applicable_age', label: '适用年龄' },
          { key: 'schedule', label: '免疫周期', multiline: true },
        ],
      },
      {
        title: '预防疾病',
        fields: [{ key: 'target_diseases', label: '预防疾病', multiline: true }],
      },
      {
        title: '接种注意',
        fields: [
          { key: 'precautions', label: '接种前后注意', multiline: true },
          { key: 'contraindications', label: '禁忌', multiline: true },
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
          { key: 'active_ingredient', label: '有效成分' },
          { key: 'parasite_targets', label: '驱虫范围', multiline: true },
        ],
      },
      {
        title: '使用方式',
        fields: [
          { key: 'dosage_form', label: '剂型' },
          { key: 'weight_range', label: '适用体重' },
          { key: 'frequency', label: '使用频率', multiline: true },
        ],
      },
      {
        title: '禁忌提示',
        fields: [{ key: 'contraindications', label: '禁忌', multiline: true }],
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
          { key: 'material', label: '猫砂材质' },
          { key: 'package_spec', label: '单包规格' },
        ],
      },
      {
        title: '使用体验',
        fields: [
          { key: 'clumping', label: '结团性' },
          { key: 'odor_control', label: '除臭能力' },
          { key: 'dust_level', label: '粉尘情况' },
        ],
      },
      {
        title: '适用场景',
        fields: [{ key: 'suitable_scene', label: '适用场景', multiline: true }],
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
