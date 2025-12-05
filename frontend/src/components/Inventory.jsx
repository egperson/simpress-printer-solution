import React, { useState, useEffect } from 'react'
import CustomInput from './CustomInput'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    qty: 0,
    image: '',
    barcode: '',
    supplier: '',
    unitPrice: 0,
    minStock: 5
  })
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('monitor.inventory')
      if (raw) setItems(JSON.parse(raw))
    } catch (e) { console.error(e) }
  }, [])

  function saveItems(newItems) {
    localStorage.setItem('monitor.inventory', JSON.stringify(newItems))
    setItems(newItems)
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande! Máximo 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      setFormData({ ...formData, image: base64 })
      setImagePreview(base64)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Nome é obrigatório!')
      return
    }

    if (editingId !== null) {
      const updated = items.map(item =>
        item.id === editingId ? { ...formData, id: editingId, updated: new Date().toISOString() } : item
      )
      saveItems(updated)
    } else {
      const newItem = {
        ...formData,
        id: Date.now(),
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
      saveItems([...items, newItem])
    }

    resetForm()
  }

  function resetForm() {
    setFormData({ name: '', qty: 0, image: '', barcode: '', supplier: '', unitPrice: 0, minStock: 5 })
    setImagePreview(null)
    setShowForm(false)
    setEditingId(null)
  }

  function handleEdit(item) {
    setFormData(item)
    setImagePreview(item.image)
    setEditingId(item.id)
    setShowForm(true)
  }

  function handleDelete(id) {
    if (!confirm('Remover item do inventário?')) return
    saveItems(items.filter(i => i.id !== id))
  }

  function exportData() {
    const dataStr = JSON.stringify(items, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        if (Array.isArray(imported)) {
          saveItems(imported)
          alert('Inventário importado com sucesso!')
        }
      } catch (e) {
        alert('Arquivo inválido!')
      }
    }
    reader.readAsText(file)
  }

  const totalValue = items.reduce((sum, item) => sum + (item.qty * (item.unitPrice || 0)), 0)
  const lowStockItems = items.filter(item => item.qty < (item.minStock || 5))

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-cyan-400">{items.length}</div>
          <div className="text-sm text-white/60 mt-1">Itens Cadastrados</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">R$ {totalValue.toFixed(2)}</div>
          <div className="text-sm text-white/60 mt-1">Valor Total</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{lowStockItems.length}</div>
          <div className="text-sm text-white/60 mt-1">Alertas de Estoque</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {items.reduce((sum, item) => sum + item.qty, 0)}
          </div>
          <div className="text-sm text-white/60 mt-1">Unidades Totais</div>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inventário</h2>
          <div className="text-sm text-white/60">Gerenciar estoque de consumíveis</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition">
            <span className="flex items-center gap-2">
              <span className="mi">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cancelar' : 'Novo Item'}
            </span>
          </button>
          <button onClick={exportData} className="px-4 py-2 rounded border border-white/10 hover:bg-white/5 transition">
            <span className="flex items-center gap-2">
              <span className="mi">download</span>
              Exportar
            </span>
          </button>
          <label className="px-4 py-2 rounded border border-white/10 hover:bg-white/5 transition cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="mi">upload</span>
              Importar
            </span>
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6">
          <h3 className="font-semibold text-lg mb-4">
            {editingId ? 'Editar Item' : 'Novo Item'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Imagem do Produto</label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded"
                  />
                  <div className="text-xs text-white/50 mt-1">Máximo 2MB (JPG, PNG, WebP)</div>
                </div>
                {imagePreview && (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded border border-white/20" />
                    <button
                      type="button"
                      onClick={() => { setFormData({ ...formData, image: '' }); setImagePreview(null) }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            <CustomInput
              label="Nome do Item *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              icon="label"
              placeholder="Ex: Toner HP 85A"
              required
            />

            <CustomInput
              label="Código de Barras"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              icon="qr_code_2"
              placeholder="Ex: 7891234567890"
            />

            <CustomInput
              label="Fornecedor"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              icon="store"
              placeholder="Ex: TechSupplies Ltda"
            />

            <CustomInput
              label="Quantidade"
              type="number"
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 0 })}
              icon="inventory_2"
              placeholder="0"
            />

            <CustomInput
              label="Preço Unitário (R$)"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
              icon="attach_money"
              placeholder="0.00"
            />

            <CustomInput
              label="Estoque Mínimo"
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 5 })}
              icon="warning"
              placeholder="5"
            />
          </div>

          {/* Calculated Values */}
          <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Valor Total deste Item:</span>
              <span className="text-lg font-bold text-cyan-400">
                R$ {((formData.qty || 0) * (formData.unitPrice || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button type="submit" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded transition font-semibold">
              {editingId ? 'Salvar Alterações' : 'Adicionar Item'}
            </button>
            <button type="button" onClick={resetForm} className="px-6 py-2 border border-white/10 hover:bg-white/5 rounded transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="card p-4 bg-yellow-500/5 border-yellow-500/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="mi text-yellow-400">warning</span>
            <h3 className="font-semibold text-yellow-300">Alertas de Estoque Baixo ({lowStockItems.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {lowStockItems.map(item => (
              <div key={item.id} className="p-2 bg-white/5 rounded text-sm">
                <div className="font-medium">{item.name}</div>
                <div className="text-white/60">
                  Estoque: {item.qty} / Mínimo: {item.minStock || 5}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item.id} className="card p-4 hover:transform hover:scale-105 transition-all">
            {/* Image */}
            <div className="relative mb-3">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-32 object-cover rounded border border-white/10"
                />
              ) : (
                <div className="w-full h-32 bg-white/5 rounded border border-white/10 flex items-center justify-center">
                  <span className="mi text-4xl text-white/30">image</span>
                </div>
              )}
              {item.qty < (item.minStock || 5) && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-0.5 rounded-full text-xs font-bold">
                  Baixo
                </div>
              )}
            </div>

            {/* Info */}
            <h3 className="font-semibold text-base mb-2 line-clamp-2">{item.name}</h3>

            {item.barcode && (
              <div className="text-xs text-white/50 mb-1 flex items-center gap-1">
                <span className="mi text-sm">qr_code_2</span>
                {item.barcode}
              </div>
            )}

            {item.supplier && (
              <div className="text-xs text-white/50 mb-2 flex items-center gap-1">
                <span className="mi text-sm">store</span>
                {item.supplier}
              </div>
            )}

            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white/70">Quantidade:</span>
              <span className={`font-bold ${item.qty < (item.minStock || 5) ? 'text-yellow-400' : 'text-green-400'}`}>
                {item.qty}
              </span>
            </div>

            {item.unitPrice > 0 && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-white/60">Preço Unit:</span>
                  <span className="text-sm">R$ {item.unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10">
                  <span className="text-xs text-white/60">Valor Total:</span>
                  <span className="text-sm font-bold text-cyan-400">
                    R$ {(item.qty * item.unitPrice).toFixed(2)}
                  </span>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => handleEdit(item)}
                className="flex-1 px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded transition"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition"
              >
                <span className="mi text-base">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && !showForm && (
        <div className="card p-12 text-center">
          <span className="mi text-6xl text-white/20 mb-4">inventory_2</span>
          <h3 className="text-xl font-semibold mb-2">Nenhum item cadastrado</h3>
          <p className="text-white/60 mb-4">Comece adicionando itens ao seu inventário</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded transition font-semibold"
          >
            Adicionar Primeiro Item
          </button>
        </div>
      )}
    </div>
  )
}
