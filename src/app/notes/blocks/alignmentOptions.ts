export const WIDTH_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'S', value: 240 },
  { label: 'M', value: 480 },
  { label: 'L', value: 720 },
  { label: 'Full', value: undefined },
]

export const ALIGNMENTS = [
  { value: 'left', label: 'Align left', icon: 'alignLeft' },
  { value: 'center', label: 'Align center', icon: 'alignCenter' },
  { value: 'right', label: 'Align right', icon: 'alignRight' },
] as const

export type Alignment = (typeof ALIGNMENTS)[number]['value']
