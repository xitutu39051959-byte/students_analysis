export interface UploadFormSchema {
  datasetName: string
  className: string
  term: string
}

export const defaultUploadForm: UploadFormSchema = {
  datasetName: `数据集-${new Date().toLocaleDateString('zh-CN')}`,
  className: '',
  term: '',
}
