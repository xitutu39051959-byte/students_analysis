import { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { useUiStore } from '../../store/uiStore'

export function SettingsPage() {
  const { options, save, reset } = useSettingsStore()
  const { showToast } = useUiStore()

  const [form, setForm] = useState({
    trendUpThreshold: options.trendUpThreshold,
    trendDownThreshold: options.trendDownThreshold,
    weakGapThreshold: options.weakGapThreshold,
  })

  return (
    <section className="page-section">
      <h2>规则设置</h2>

      <div className="panel form-grid">
        <label>
          上升阈值（默认 +5）
          <input
            type="number"
            value={form.trendUpThreshold}
            onChange={(e) => setForm((prev) => ({ ...prev, trendUpThreshold: Number(e.target.value) }))}
          />
        </label>

        <label>
          下降阈值（默认 -5）
          <input
            type="number"
            value={form.trendDownThreshold}
            onChange={(e) => setForm((prev) => ({ ...prev, trendDownThreshold: Number(e.target.value) }))}
          />
        </label>

        <label>
          薄弱科目差值阈值（默认 8）
          <input
            type="number"
            value={form.weakGapThreshold}
            onChange={(e) => setForm((prev) => ({ ...prev, weakGapThreshold: Number(e.target.value) }))}
          />
        </label>
      </div>

      <div className="panel-title-row">
        <button
          onClick={() => {
            save(form)
            showToast('设置已保存', 'success')
          }}
        >
          保存设置
        </button>

        <button
          onClick={() => {
            reset()
            setForm({ trendUpThreshold: 5, trendDownThreshold: -5, weakGapThreshold: 8 })
            showToast('已恢复默认设置', 'info')
          }}
        >
          恢复默认
        </button>
      </div>
    </section>
  )
}
