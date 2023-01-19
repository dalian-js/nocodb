import RenameFile from './RenameFile.vue'
import {
  ColumnInj,
  EditModeInj,
  IsFormInj,
  IsPublicInj,
  MetaInj,
  NOCO,
  ReadonlyInj,
  computed,
  inject,
  isImage,
  message,
  ref,
  useApi,
  useFileDialog,
  useI18n,
  useInjectionState,
  useProject,
  watch,
} from '#imports'
import MdiPdfBox from '~icons/mdi/pdf-box'
import MdiFileWordOutline from '~icons/mdi/file-word-outline'
import MdiFilePowerpointBox from '~icons/mdi/file-powerpoint-box'
import MdiFileExcelOutline from '~icons/mdi/file-excel-outline'
import IcOutlineInsertDriveFile from '~icons/ic/outline-insert-drive-file'

interface AttachmentProps extends File {
  data?: any
  file: File
  title: string
  mimetype: string
}

export const [useProvideAttachmentCell, useAttachmentCell] = useInjectionState(
  (updateModelValue: (data: string | Record<string, any>[]) => void) => {
    const isReadonly = inject(ReadonlyInj, ref(false))

    const isPublic = inject(IsPublicInj, ref(false))

    const isForm = inject(IsFormInj, ref(false))

    const meta = inject(MetaInj, ref())

    const column = inject(ColumnInj, ref())

    const editEnabled = inject(EditModeInj, ref(false))

    /** keep user selected File object */
    const storedFiles = ref<AttachmentProps[]>([])

    const attachments = ref<AttachmentProps[]>([])

    const modalVisible = ref(false)

    /** for image carousel */
    const selectedImage = ref()

    const { project } = useProject()

    const { api, isLoading } = useApi()

    const { files, open } = useFileDialog()

    const { t } = useI18n()

    /** our currently visible items, either the locally stored or the ones from db, depending on isPublic & isForm status */
    const visibleItems = computed<any[]>(() => (isPublic.value && isForm.value ? storedFiles.value : attachments.value))

    /** for bulk download */
    const selectedVisibleItems = ref<boolean[]>(Array.from({ length: visibleItems.value.length }, () => false))

    /** remove a file from our stored attachments (either locally stored or saved ones) */
    function removeFile(i: number) {
      if (isPublic.value) {
        storedFiles.value.splice(i, 1)
        attachments.value.splice(i, 1)

        updateModelValue(storedFiles.value)
      } else {
        attachments.value.splice(i, 1)

        updateModelValue(JSON.stringify(attachments.value))
      }
    }

    /** save a file on select / drop, either locally (in-memory) or in the db */
    async function onFileSelect(selectedFiles: FileList | File[]) {
      if (!selectedFiles.length) return

      if (isPublic.value && isForm.value) {
        const newFiles = await Promise.all<AttachmentProps>(
          Array.from(selectedFiles).map(
            (file) =>
              new Promise<AttachmentProps>((resolve) => {
                const res: AttachmentProps = { ...file, file, title: file.name, mimetype: file.type }

                renameFile(file).then((renamedFile) => {
                  if (isImage(renamedFile.name, (<any>renamedFile).mimetype ?? renamedFile.type)) {
                    const reader = new FileReader()

                    reader.onload = (e) => {
                      res.data = e.target?.result

                      resolve(res)
                    }

                    reader.onerror = () => {
                      resolve(res)
                    }

                    reader.readAsDataURL(file)
                  } else {
                    resolve(res)
                  }
                })
              }),
          ),
        )

        attachments.value = [...attachments.value, ...newFiles]

        return updateModelValue(attachments.value)
      }

      const newAttachments = []

      const attachmentMeta = typeof column.value?.meta === 'string' ? JSON.parse(column.value.meta) : column.value?.meta

      const files: File[] = []

      for (let file of selectedFiles) {
        // verify number of files
        if (visibleItems.value.length + selectedFiles.length > attachmentMeta.maxNumberOfAttachments) {
          message.error(
            `You can only upload at most ${attachmentMeta.maxNumberOfAttachments} file${
              attachmentMeta.maxNumberOfAttachments > 1 ? 's' : ''
            } to this cell.`,
          )
          return
        }

        // verify file size
        if (file.size > attachmentMeta.maxAttachmentSize * 1024 * 1024) {
          message.error(`The size of ${file.name} exceeds the maximum file size ${attachmentMeta.maxAttachmentSize} MB.`)
          continue
        }

        // verify mime type
        if (attachmentMeta.unsupportedAttachmentMimeTypes.includes(file.type)) {
          message.error(`${file.name} has the mime type ${file.type} which is not allowed in this column.`)
          continue
        }

        file = await renameFile(file)

        files.push(file)
      }

      try {
        const data = await api.storage.upload(
          {
            path: [NOCO, project.value.title, meta.value?.title, column.value?.title].join('/'),
          },
          {
            files,
            json: '{}',
          },
        )
        newAttachments.push(...data)
      } catch (e: any) {
        message.error(e.message || t('msg.error.internalError'))
      }

      updateModelValue(JSON.stringify([...attachments.value, ...newAttachments]))
    }

    async function renameFile(file: File) {
      return new Promise<File>((resolve) => {
        const { close } = useDialog(RenameFile, {
          fileName: file.name,
          fileNames: [...attachments.value.map((file) => file.title), ...storedFiles.value.map((file) => file.title)],
          onRename: (newName: string) => {
            close()
            resolve(
              new File([file], newName, {
                type: file.type,
                lastModified: file.lastModified,
              }),
            )
          },
          onCancel: () => {
            close()
            resolve(file)
          },
        })
      })
    }

    /** save files on drop */
    async function onDrop(droppedFiles: File[] | null) {
      if (droppedFiles) {
        // set files
        await onFileSelect(droppedFiles)
      }
    }

    /** bulk download selected files */
    async function bulkDownloadFiles() {
      await Promise.all(selectedVisibleItems.value.map(async (v, i) => v && (await downloadFile(visibleItems.value[i]))))
      selectedVisibleItems.value = Array.from({ length: visibleItems.value.length }, () => false)
    }

    /** download a file */
    async function downloadFile(item: Record<string, any>) {
      ;(await import('file-saver')).saveAs(item.url || item.data, item.title)
    }

    const FileIcon = (icon: string) => {
      switch (icon) {
        case 'mdi-pdf-box':
          return MdiPdfBox
        case 'mdi-file-word-outline':
          return MdiFileWordOutline
        case 'mdi-file-powerpoint-box':
          return MdiFilePowerpointBox
        case 'mdi-file-excel-outline':
          return MdiFileExcelOutline
        default:
          return IcOutlineInsertDriveFile
      }
    }

    watch(files, (nextFiles) => nextFiles && onFileSelect(nextFiles))

    return {
      attachments,
      visibleItems,
      isPublic,
      isForm,
      isReadonly,
      meta,
      column,
      editEnabled,
      isLoading,
      api,
      open: () => open(),
      onDrop,
      modalVisible,
      FileIcon,
      removeFile,
      renameFile,
      downloadFile,
      updateModelValue,
      selectedImage,
      selectedVisibleItems,
      storedFiles,
      bulkDownloadFiles,
    }
  },
  'useAttachmentCell',
)
