import React, { useState, useEffect } from 'react'
import CustomCard from './CustomCard'
import CustomInput from './CustomInput'
import CustomButton from './CustomButton'
import CustomCheckbox from './CustomCheckbox'

export default function Maintenance() {
  const [tasks, setTasks] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    device: '',
    description: '',
    schedule: '',
    priority: 'medium',
    assignedTo: ''
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('monitor.maintenance')
      if (raw) setTasks(JSON.parse(raw))
    } catch (e) { console.error(e) }
  }, [])

  function saveTasks(newTasks) {
    localStorage.setItem('monitor.maintenance', JSON.stringify(newTasks))
    setTasks(newTasks)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const newTask = {
      ...formData,
      id: Date.now(),
      done: false,
      created: new Date().toISOString()
    }
    saveTasks([...tasks, newTask])
    setFormData({ device: '', description: '', schedule: '', priority: 'medium', assignedTo: '' })
    setShowForm(false)
  }

  function toggleDone(id) {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    saveTasks(updated)
  }

  function deleteTask(id) {
    if (!confirm('Remover tarefa?')) return
    saveTasks(tasks.filter(t => t.id !== id))
  }

  const pendingTasks = tasks.filter(t => !t.done)
  const completedTasks = tasks.filter(t => t.done)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manutenção</h1>
          <p className="text-white/60">Agenda de manutenções preventivas e corretivas</p>
        </div>
        <CustomButton
          icon={showForm ? 'close' : 'add'}
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : 'Nova Tarefa'}
        </CustomButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CustomCard variant="default" hover className="text-center p-4">
          <span className="mi text-4xl">assignment</span>
          <div className="text-2xl font-bold mt-2">{tasks.length}</div>
          <div className="text-sm text-white/60">Total</div>
        </CustomCard>

        <CustomCard variant="warning" hover className="text-center p-4">
          <span className="mi text-4xl text-yellow-400">pending</span>
          <div className="text-2xl font-bold text-yellow-400 mt-2">{pendingTasks.length}</div>
          <div className="text-sm text-white/60">Pendentes</div>
        </CustomCard>

        <CustomCard variant="success" hover className="text-center p-4">
          <span className="mi text-4xl text-green-400">check_circle</span>
          <div className="text-2xl font-bold text-green-400 mt-2">{completedTasks.length}</div>
          <div className="text-sm text-white/60">Concluídas</div>
        </CustomCard>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit}>
          <CustomCard title="Nova Tarefa de Manutenção" icon="add_task">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                label="Dispositivo *"
                value={formData.device}
                onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                icon="print"
                required
              />

              <CustomInput
                label="Agendado Para"
                type="datetime-local"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                icon="schedule"
              />

              <div className="md:col-span-2">
                <CustomInput
                  label="Descrição *"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  icon="description"
                  required
                />
              </div>

              <CustomInput
                label="Responsável"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                icon="person"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <CustomButton type="submit" icon="save">Salvar Tarefa</CustomButton>
              <CustomButton type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </CustomButton>
            </div>
          </CustomCard>
        </form>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <CustomCard title="Tarefas Pendentes" subtitle={`${pendingTasks.length} aguardando`} icon="pending_actions" variant="warning">
          <div className="space-y-3">
            {pendingTasks.map(task => (
              <div key={task.id} className="p-4 bg-white/5 rounded border border-yellow-500/20">
                <div className="flex items-start gap-3">
                  <CustomCheckbox
                    checked={task.done}
                    onChange={() => toggleDone(task.id)}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{task.device}</h3>
                    <p className="text-sm text-white/70 mt-1">{task.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-white/50">
                      {task.schedule && (
                        <span className="flex items-center gap-1">
                          <span className="mi text-sm">schedule</span>
                          {new Date(task.schedule).toLocaleString('pt-BR')}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className="flex items-center gap-1">
                          <span className="mi text-sm">person</span>
                          {task.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>
                  <CustomButton size="small" variant="ghost" icon="delete" onClick={() => deleteTask(task.id)} />
                </div>
              </div>
            ))}
          </div>
        </CustomCard>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <CustomCard title="Tarefas Concluídas" subtitle={`${completedTasks.length} finalizadas`} icon="done_all" variant="success">
          <div className="space-y-2">
            {completedTasks.map(task => (
              <div key={task.id} className="p-3 bg-white/5 rounded opacity-60">
                <div className="flex items-center gap-3">
                  <CustomCheckbox checked={task.done} onChange={() => toggleDone(task.id)} />
                  <div className="flex-1 line-through text-sm">
                    <span className="font-medium">{task.device}</span>
                    <span className="text-white/60 ml-2">{task.description}</span>
                  </div>
                  <CustomButton size="small" variant="ghost" icon="delete" onClick={() => deleteTask(task.id)} />
                </div>
              </div>
            ))}
          </div>
        </CustomCard>
      )}

      {tasks.length === 0 && (
        <CustomCard className="text-center py-12">
          <span className="mi text-6xl text-white/20">build</span>
          <h3 className="text-xl font-semibold mt-4">Nenhuma tarefa de manutenção</h3>
          <p className="text-white/60 mt-2">Comece criando uma nova tarefa</p>
        </CustomCard>
      )}
    </div>
  )
}
