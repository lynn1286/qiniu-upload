import { FileOutlined, InboxOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { TabsProps, UploadProps } from 'antd'
import { Alert, Button, Checkbox, Input, Tabs, Tooltip, Upload, message } from 'antd'
import { useEffect } from 'react'
import { useLocalStorageState } from 'ahooks'
import { QiniuConfig, qiniuUpload } from '@/utils/qiniu'
import { copyTextToClipboard } from '@/utils/copy'
import { QINIUKEY } from '../options/App'

const { Dragger } = Upload

let imageRegex = /data:image\/|\.(gif|jpe?g|tiff|png)$/i

function FileItem({ fileName, md }: { fileName: string; md: boolean }) {
  if (!fileName) return null

  if (fileName.match(imageRegex)) {
    return (
      <div
        onClick={() => {
          copyTextToClipboard(md ? `![](${fileName} "图片alt")` : fileName)
          message.success('已复制到粘贴板')
        }}
        className="file-item"
      >
        <img src={fileName} style={{ width: '100%' }} />
      </div>
    )
  } else {
    return (
      <div className="file-item">
        <div
          onClick={() => {
            copyTextToClipboard(fileName)
            message.success('已复制到粘贴板')
          }}
        >
          <FileOutlined /> <span style={{ wordBreak: 'break-all' }}>{fileName}</span>
        </div>
      </div>
    )
  }
}

function IndexPopup() {
  const [md, setMd] = useLocalStorageState<boolean>('copyMd', { defaultValue: false })
  const [imgList, setimgList] = useLocalStorageState<string[]>('fileList', {
    defaultValue: [],
  })
  const [qiniuConfig] = useLocalStorageState<Partial<QiniuConfig>>(QINIUKEY)

  useEffect(() => {
    document.onpaste = (event) => {
      const items = event.clipboardData?.items

      if (items) {
        for (const item of items) {
          if (item.kind === 'file') {
            var blob = item.getAsFile()
            qiniuUpload(blob as File, qiniuConfig as QiniuConfig).then((res) => {
              copyTextToClipboard(md ? `[](${res} "图片alt")` : res)
              setimgList((prev) => {
                if (!!prev?.length) {
                  return [...prev, res]
                } else {
                  return [res]
                }
              })
              message.success('上传成功，已复制')
            })
          }
        }
      }
    }
  }, [qiniuConfig, md])

  const props: UploadProps = {
    name: 'file',
    multiple: true,
    customRequest({ file, onSuccess, onError }) {
      qiniuUpload(file as File, qiniuConfig as QiniuConfig)
        .then((res) => {
          copyTextToClipboard(md ? `[](${res} "")` : res)
          setimgList((prev) => {
            if (!!prev?.length) {
              return [...prev, res]
            } else {
              return [res]
            }
          })
          message.success('上传成功，已复制')
          onSuccess?.(res)
        })
        .catch(onError)
    },
  }

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: '上传',
      children: (
        <>
          {qiniuConfig?.accessKey || qiniuConfig?.token ? (
            <div>
              <div className="mb-2 bg-[#e0f2fe] rounded-md text-xs p-2">
                <Input placeholder="^/⌘ + v 剪贴板上传" className="mb-1" />
                <Checkbox onChange={(e) => setMd(e.target.checked)}>
                  <Tooltip title="开启markdown复制模式, 例如: ![](${fileName} '图片alt')">
                    <QuestionCircleOutlined className="mr-1" />
                  </Tooltip>
                  markdown
                </Checkbox>
              </div>

              <Dragger {...props}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此处</p>
                <p className="ant-upload-hint">支持多文件上传</p>
              </Dragger>
            </div>
          ) : (
            <div>
              <Alert
                showIcon
                message="请先填写配置"
                description={
                  <a target="_blank" href="/options.html">
                    去设置
                  </a>
                }
                type="success"
              />
            </div>
          )}
        </>
      ),
    },
    {
      key: '2',
      label: '历史记录',
      style: { height: 250, overflow: 'auto' },
      children: (
        <>
          {!!imgList?.length && (
            <div className="mb-2 text-right">
              <Button size="small" onClick={() => setimgList([])} type="primary" danger>
                清除记录
              </Button>
            </div>
          )}
          {imgList?.map((fileName) => <FileItem md={!!md} fileName={fileName} key={fileName} />)}
        </>
      ),
    },
  ]

  return (
    <div
      style={{
        minWidth: 220,
        maxWidth: 390,
        padding: '0 8px 8px',
      }}
    >
      <Tabs animated={false} defaultActiveKey="1" type="line" items={items} />
    </div>
  )
}

export default IndexPopup
