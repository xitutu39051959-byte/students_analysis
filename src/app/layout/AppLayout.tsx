import { NavLink, Outlet } from 'react-router-dom'
import { ToastList } from '../../components/feedback/ToastList'
import { useDatasetStore } from '../../store/datasetStore'

const navItems = [
  { to: '/upload', label: '数据导入' },
  { to: '/class-analysis', label: '班级分析' },
  { to: '/student-analysis', label: '学生分析' },
  { to: '/comments', label: '评语生成' },
  { to: '/settings', label: '规则设置' },
]

export function AppLayout() {
  const { datasets, activeDatasetId, setActive } = useDatasetStore()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>学生成绩分析工具</h1>
          <p>单班单学期成绩分析（教师版）</p>
        </div>
        <div className="dataset-switcher">
          <label htmlFor="dataset-select">当前数据集</label>
          <select
            id="dataset-select"
            value={activeDatasetId ?? ''}
            onChange={(event) => {
              const id = event.target.value
              if (id) {
                void setActive(id)
              }
            }}
          >
            <option value="">未选择</option>
            {datasets.map((dataset) => (
              <option key={dataset.datasetId} value={dataset.datasetId}>
                {dataset.datasetName}（{dataset.className} / {dataset.term}）
              </option>
            ))}
          </select>
        </div>
      </header>

      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>

      <ToastList />
    </div>
  )
}
