import { useState } from "react"
import { Icon } from "../icons"
import {
  getServices,
  getCategories,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  toggleServiceFeatured,
  getDefaultService,
  getNextServiceId,
} from "../services/serviceService"

/**
 * ServicesAdmin Component
 * 
 * Manages service data with full CRUD functionality.
 * Features:
 * - Search by title/description (FR/EN)
 * - Filter by category and status
 * - Toggle Published/Draft status
 * - Toggle Featured flag
 * - Inline edit/delete operations
 * - Bilingual support (FR/EN)
 */
function ServicesAdmin({ notify }) {
  const [services, setServices] = useState(() => getServices())
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Toutes")
  const [status, setStatus] = useState("Tous")
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const categories = getCategories()
  const categoryOptions = ["Toutes", ...categories]

  // Helper component for display
  const Button = ({ onClick, icon, variant = "default", children, disabled = false, title = "" }) => (
    <button
      onClick={onClick}
      className={`button button-${variant} ${disabled ? "disabled" : ""}`}
      disabled={disabled}
      title={title}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )

  const AdminTitle = ({ title, subtitle, action }) => (
    <div className="admin-section-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && <div className="header-actions">{action}</div>}
    </div>
  )

  const filtered = services.filter(
    (s) =>
      (s.title.fr.toLowerCase().includes(search.toLowerCase()) ||
        s.title.en.toLowerCase().includes(search.toLowerCase()) ||
        s.description.fr.toLowerCase().includes(search.toLowerCase()) ||
        s.description.en.toLowerCase().includes(search.toLowerCase())) &&
      (category === "Toutes" || s.category === category) &&
      (status === "Tous" || s.status === status),
  )

  const save = (service) => {
    try {
      if (editing === "new") {
        createService(service)
      } else {
        updateService(service.id, service)
      }
      // Trigger refresh
      setServices(getServices())
      setEditing(null)
      notify(
        editing === "new" ? "Service ajouté avec succès" : "Service mis à jour",
      )
    } catch (error) {
      notify(`Erreur: ${error.message}`)
    }
  }

  return (
    <>
      <AdminTitle
        title="Services"
        subtitle={`${services.length} services au total · ${services.filter((s) => s.status === "Published").length} publiés`}
        action={
          <Button onClick={() => setEditing("new")} icon="plus">
            Ajouter un service
          </Button>
        }
      />
      <div className="admin-card table-card">
        <div className="table-tools">
          <div className="search-field">
            <Icon name="search" />
            <input
              placeholder="Rechercher un service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Tous</option>
            <option>Published</option>
            <option>Draft</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Mis en avant</th>
                <th>Ordre</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.title.fr}</strong>
                    <small>{s.title.en}</small>
                  </td>
                  <td>{s.category}</td>
                  <td>
                    <button
                      className={`status ${s.status.toLowerCase()}`}
                      onClick={() => {
                        try {
                          toggleServiceStatus(s.id)
                          setServices(getServices())
                          notify(
                            s.status === "Published"
                              ? "Service dépublié"
                              : "Service publié",
                          )
                        } catch (error) {
                          notify(`Erreur: ${error.message}`)
                        }
                      }}
                    >
                      {s.status}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`status ${s.featured ? "featured" : "not-featured"}`}
                      onClick={() => {
                        try {
                          toggleServiceFeatured(s.id)
                          setServices(getServices())
                          notify(
                            s.featured ? "Retiré des mis en avant" : "Ajouté aux mis en avant",
                          )
                        } catch (error) {
                          notify(`Erreur: ${error.message}`)
                        }
                      }}
                    >
                      {s.featured ? "Oui" : "Non"}
                    </button>
                  </td>
                  <td>#{s.displayOrder}</td>
                  <td>
                    <div className="row-actions">
                      <button title="Modifier" onClick={() => setEditing(s)}>
                        <Icon name="edit" />
                      </button>
                      <button title="Supprimer" onClick={() => setDeleting(s)}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Icon name="search" size={30} />
              <h3>Aucun service trouvé</h3>
              <p>Essayez de modifier votre recherche ou vos filtres.</p>
            </div>
          )}
        </div>
        <div className="pagination">
          <span>
            Affichage de 1 à {filtered.length} sur {filtered.length}
          </span>
          <div>
            <button disabled>Précédent</button>
            <button className="active">1</button>
            <button disabled>Suivant</button>
          </div>
        </div>
      </div>
      {editing && (
        <ServicesEditor
          service={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {deleting && (
        <Confirm
          title={`Supprimer "${deleting.title.fr}" ?`}
          text="Cette action retirera le service du portfolio. Elle est irréversible."
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            try {
              deleteService(deleting.id)
              setServices(getServices())
              setDeleting(null)
              notify("Service supprimé")
            } catch (error) {
              notify(`Erreur: ${error.message}`)
            }
          }}
        />
      )}
    </>
  )
}

/**
 * ServicesEditor Component
 * 
 * Modal form for editing/creating services with bilingual support.
 * Features:
 * - Bilingual title (FR/EN)
 * - Bilingual description (FR/EN)
 * - Icon selector
 * - Category input
 * - Status toggle
 * - Featured flag
 * - Validation with error display
 */
function ServicesEditor({ service, onClose, onSave }) {
  const categories = getCategories()
  const nextId = getNextServiceId()
  const base = service || getDefaultService(nextId)
  const [form, setForm] = useState(base)
  const [errors, setErrors] = useState({})

  // Common icons for services
  const iconOptions = [
    "code",
    "monitor",
    "layers",
    "spark",
    "zap",
    "target",
    "users",
    "check",
    "star",
    "heart",
  ]

  const set = (key, value) => {
    setForm({ ...form, [key]: value })
    // Clear error for this field when modified
    if (errors[key]) {
      setErrors({ ...errors, [key]: null })
    }
  }

  const setNested = (parent, key, value) => {
    setForm({
      ...form,
      [parent]: {
        ...form[parent],
        [key]: value,
      },
    })
    const errorKey = `${parent}.${key}`
    if (errors[errorKey]) {
      setErrors({ ...errors, [errorKey]: null })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Validate required fields
    if (!form.title?.fr?.trim()) {
      newErrors["title.fr"] = "Titre FR obligatoire"
    }
    if (!form.title?.en?.trim()) {
      newErrors["title.en"] = "Titre EN obligatoire"
    }
    if (!form.description?.fr?.trim()) {
      newErrors["description.fr"] = "Description FR obligatoire"
    }
    if (!form.description?.en?.trim()) {
      newErrors["description.en"] = "Description EN obligatoire"
    }
    if (!form.icon?.trim()) {
      newErrors.icon = "Icône obligatoire"
    }

    return newErrors
  }

  const handleSave = (e) => {
    e.preventDefault()
    const newErrors = validateForm()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(form)
  }

  const Button = ({ onClick, variant = "default", type = "button", children, disabled = false }) => (
    <button
      type={type}
      onClick={onClick}
      className={`button button-${variant} ${disabled ? "disabled" : ""}`}
      disabled={disabled}
    >
      {children}
    </button>
  )

  return (
    <div className="modal-backdrop">
      <div className="editor-modal large-form">
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <div className="editor-header">
          <span>
            <Icon name="layers" />
          </span>
          <h2>{service ? "Modifier le service" : "Ajouter un service"}</h2>
        </div>
        <form onSubmit={handleSave}>
          <div className="editor-grid">
            <div className="editor-section">
              <h3>Informations générales</h3>

              <label>
                Titre FR
                <input
                  autoFocus
                  value={form.title?.fr || ""}
                  onChange={(e) => setNested("title", "fr", e.target.value)}
                  placeholder="ex: Développement Web"
                  className={errors["title.fr"] ? "error" : ""}
                />
                {errors["title.fr"] && <span className="error-text">{errors["title.fr"]}</span>}
              </label>

              <label>
                Titre EN
                <input
                  value={form.title?.en || ""}
                  onChange={(e) => setNested("title", "en", e.target.value)}
                  placeholder="ex: Web Development"
                  className={errors["title.en"] ? "error" : ""}
                />
                {errors["title.en"] && <span className="error-text">{errors["title.en"]}</span>}
              </label>

              <label>
                Icône
                <select
                  value={form.icon}
                  onChange={(e) => set("icon", e.target.value)}
                  className={errors.icon ? "error" : ""}
                >
                  <option value="">Sélectionner une icône...</option>
                  {iconOptions.map((icon) => (
                    <option key={icon}>{icon}</option>
                  ))}
                </select>
                {errors.icon && <span className="error-text">{errors.icon}</span>}
              </label>

              <label>
                Catégorie
                <input
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="ex: Development"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </datalist>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                />
                Mettre en avant ce service
              </label>
            </div>

            <div className="editor-section">
              <h3>Descriptions bilingues</h3>

              <label>
                Description FR
                <textarea
                  rows={4}
                  value={form.description?.fr || ""}
                  onChange={(e) => setNested("description", "fr", e.target.value)}
                  placeholder="Description en français..."
                  className={errors["description.fr"] ? "error" : ""}
                />
                {errors["description.fr"] && (
                  <span className="error-text">{errors["description.fr"]}</span>
                )}
              </label>

              <label>
                Description EN
                <textarea
                  rows={4}
                  value={form.description?.en || ""}
                  onChange={(e) => setNested("description", "en", e.target.value)}
                  placeholder="Description in English..."
                  className={errors["description.en"] ? "error" : ""}
                />
                {errors["description.en"] && (
                  <span className="error-text">{errors["description.en"]}</span>
                )}
              </label>

              <label>
                Statut
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option>Draft</option>
                  <option>Published</option>
                </select>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {service ? "Mettre à jour" : "Ajouter le service"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Confirm({ title, text, onCancel, onConfirm }) {
  const Button = ({ onClick, variant = "default", children }) => (
    <button
      onClick={onClick}
      className={`button button-${variant}`}
    >
      {children}
    </button>
  )

  return (
    <div className="modal-backdrop">
      <div className="confirm-modal">
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="confirm-actions">
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  )
}

export { ServicesAdmin, ServicesEditor }
