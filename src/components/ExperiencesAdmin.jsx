/**
 * Experiences Admin Component
 * 
 * Manages CRUD operations for experiences:
 * - Lists all experiences (Published + Draft + Archived)
 * - Create new experience
 * - Edit existing experience
 * - Delete experience
 * - Toggle publish/draft status
 * - Reorder experiences by displayOrder
 */

import { useState, useEffect } from "react"
import { Icon } from "../icons"
import {
  getExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
  toggleExperienceStatus,
  validateExperienceData,
  getExperienceTypes,
} from "../services/experienceService"

function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  type = "button",
  className = "",
  disabled = false,
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {icon && <Icon name={icon} size={17} />}
    </button>
  )
}

function ExperienceForm({ experience, onClose, onSave, notify }) {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [experienceTypes, setExperienceTypes] = useState([])

  const [formData, setFormData] = useState(
    experience || {
      type: { fr: "Expérience", en: "Experience" },
      title: { fr: "", en: "" },
      organization: { fr: "", en: "" },
      place: "",
      description: { fr: "", en: "" },
      responsibilities: { fr: "", en: "" },
      technologies: [],
      startDate: "",
      endDate: "",
      currentPosition: false,
      location: "",
      status: "Draft",
      displayOrder: 0,
    }
  )

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await getExperienceTypes()
        setExperienceTypes(types)
      } catch (err) {
        console.error("Error loading experience types:", err)
      }
    }
    loadTypes()
  }, [])

  const handleChange = (field, value, subField = null) => {
    setFormData((prev) => {
      if (subField) {
        return {
          ...prev,
          [field]: {
            ...prev[field],
            [subField]: value,
          },
        }
      }
      return {
        ...prev,
        [field]: value,
      }
    })
    setErrors([])
  }

  const handleTechnologiesChange = (value) => {
    // Parse comma-separated or array input
    const techs = typeof value === "string"
      ? value.split(",").map((t) => t.trim()).filter(Boolean)
      : value
    setFormData((prev) => ({
      ...prev,
      technologies: techs,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors([])

    try {
      // Validate
      const validation = validateExperienceData(formData)
      if (!validation.valid) {
        setErrors(validation.errors)
        return
      }

      // Save
      if (experience?.id) {
        await updateExperience(experience.id, formData)
        notify("Expérience mise à jour")
      } else {
        await createExperience(formData)
        notify("Expérience créée")
      }

      onSave()
    } catch (err) {
      console.error("Error saving experience:", err)
      notify(`Erreur: ${err.message}`)
      setErrors([err.message])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>{experience ? "Modifier l'expérience" : "Nouvelle expérience"}</h2>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="modal-content">
        <form onSubmit={handleSubmit} className="admin-form">
          {errors.length > 0 && (
            <div className="form-errors">
              {errors.map((err, idx) => (
                <div key={idx} className="error-message">
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Type/Category */}
          <div className="form-section">
            <label>Type d'expérience</label>
            <input
              type="text"
              value={formData.type.fr}
              onChange={(e) => handleChange("type", e.target.value, "fr")}
              placeholder="Expérience, Formation, Stage..."
              list="experience-types"
            />
            <datalist id="experience-types">
              {experienceTypes.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>

          {/* Bilingual Title */}
          <div className="form-section">
            <label>Titre *</label>
            <div className="bilingual-inputs">
              <input
                type="text"
                value={formData.title.fr}
                onChange={(e) => handleChange("title", e.target.value, "fr")}
                placeholder="Titre (Français)"
                required
              />
              <input
                type="text"
                value={formData.title.en}
                onChange={(e) => handleChange("title", e.target.value, "en")}
                placeholder="Title (English)"
                required
              />
            </div>
          </div>

          {/* Organization (Bilingual) */}
          <div className="form-section">
            <label>Organisme/Entreprise</label>
            <div className="bilingual-inputs">
              <input
                type="text"
                value={formData.organization.fr}
                onChange={(e) => handleChange("organization", e.target.value, "fr")}
                placeholder="Entreprise (Français)"
              />
              <input
                type="text"
                value={formData.organization.en}
                onChange={(e) => handleChange("organization", e.target.value, "en")}
                placeholder="Company (English)"
              />
            </div>
          </div>

          {/* Place */}
          <div className="form-section">
            <label>Établissement/Lieu *</label>
            <input
              type="text"
              value={formData.place}
              onChange={(e) => handleChange("place", e.target.value)}
              placeholder="ESPRIT, Universidade..."
              required
            />
          </div>

          {/* Bilingual Description */}
          <div className="form-section">
            <label>Description *</label>
            <div className="bilingual-inputs">
              <textarea
                value={formData.description.fr}
                onChange={(e) => handleChange("description", e.target.value, "fr")}
                placeholder="Description (Français)"
                rows="3"
                required
              />
              <textarea
                value={formData.description.en}
                onChange={(e) => handleChange("description", e.target.value, "en")}
                placeholder="Description (English)"
                rows="3"
                required
              />
            </div>
          </div>

          {/* Bilingual Responsibilities/Mission */}
          <div className="form-section">
            <label>Mission/Responsabilités</label>
            <div className="bilingual-inputs">
              <textarea
                value={formData.responsibilities.fr}
                onChange={(e) => handleChange("responsibilities", e.target.value, "fr")}
                placeholder="Mission (Français)"
                rows="2"
              />
              <textarea
                value={formData.responsibilities.en}
                onChange={(e) => handleChange("responsibilities", e.target.value, "en")}
                placeholder="Mission (English)"
                rows="2"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="form-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label>Date de début</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <label>Date de fin</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                disabled={formData.currentPosition}
              />
            </div>
          </div>

          {/* Current Position */}
          <div className="form-section">
            <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={formData.currentPosition}
                onChange={(e) => {
                  handleChange("currentPosition", e.target.checked)
                  if (e.target.checked) {
                    handleChange("endDate", "")
                  }
                }}
              />
              Position actuelle
            </label>
          </div>

          {/* Technologies */}
          <div className="form-section">
            <label>Technologiess (séparées par des virgules)</label>
            <textarea
              value={Array.isArray(formData.technologies) ? formData.technologies.join(", ") : ""}
              onChange={(e) => handleTechnologiesChange(e.target.value)}
              placeholder="React, Node.js, TypeScript, ..."
              rows="2"
            />
          </div>

          {/* Location */}
          <div className="form-section">
            <label>Localisation géographique</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Tunis, Paris, ..."
            />
          </div>

          {/* Display Order */}
          <div className="form-section">
            <label>Ordre d'affichage</label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={(e) => handleChange("displayOrder", parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>

          {/* Status */}
          <div className="form-section">
            <label>Statut</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="Draft">Brouillon</option>
              <option value="Published">Publié</option>
              <option value="Archived">Archivé</option>
            </select>
          </div>

          {/* Footer */}
          <div className="form-footer">
            <Button variant="ghost" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : experience ? "Mettre à jour" : "Ajouter"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ExperiencesAdmin({ notify }) {
  const [experiences, setExperiences] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState(null)
  const [statusFilter, setStatusFilter] = useState("All")

  useEffect(() => {
    loadExperiences()
  }, [])

  const loadExperiences = async () => {
    try {
      setIsLoading(true)
      const data = await getExperiences()
      setExperiences(data.sort((a, b) => a.displayOrder - b.displayOrder))
    } catch (err) {
      console.error("Error loading experiences:", err)
      notify(`Erreur: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette expérience?")) return

    try {
      await deleteExperience(id)
      notify("Expérience supprimée")
      loadExperiences()
    } catch (err) {
      console.error("Error deleting experience:", err)
      notify(`Erreur: ${err.message}`)
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      await toggleExperienceStatus(id)
      notify("Statut mis à jour")
      loadExperiences()
    } catch (err) {
      console.error("Error toggling status:", err)
      notify(`Erreur: ${err.message}`)
    }
  }

  const handleSave = async () => {
    setShowForm(false)
    setSelectedExperience(null)
    loadExperiences()
  }

  const filteredExperiences = experiences.filter((exp) => {
    const matchesSearch =
      exp.title.fr.toLowerCase().includes(search.toLowerCase()) ||
      exp.title.en.toLowerCase().includes(search.toLowerCase()) ||
      exp.place.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "All" || exp.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <>
      <div className="admin-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2>Parcours & Expériences</h2>
          <p>Gérez les formations, stages et projets académiques.</p>
        </div>
        <Button
          icon="plus"
          onClick={() => {
            setSelectedExperience(null)
            setShowForm(true)
          }}
        >
          Ajouter
        </Button>
      </div>

      <div className="admin-card table-card">
        <div className="table-tools">
          <div className="search-field">
            <Icon name="search" />
            <input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">Tous les statuts</option>
            <option value="Published">Publié</option>
            <option value="Draft">Brouillon</option>
            <option value="Archived">Archivé</option>
          </select>
        </div>

        <div className="table-wrap">
          {isLoading ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              Chargement...
            </div>
          ) : filteredExperiences.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              Aucune expérience trouvée
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Lieu</th>
                  <th>Statut</th>
                  <th>Ordre</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExperiences.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <strong>{exp.title.fr}</strong>
                      <br />
                      <small>{exp.title.en}</small>
                    </td>
                    <td>{exp.type.fr}</td>
                    <td>{exp.place}</td>
                    <td>
                      <span className={`status-badge status-${exp.status.toLowerCase()}`}>
                        {exp.status}
                      </span>
                    </td>
                    <td>{exp.displayOrder}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setSelectedExperience(exp)
                            setShowForm(true)
                          }}
                          title="Modifier"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleStatus(exp.id)}
                          title={exp.status === "Published" ? "Dépublier" : "Publier"}
                        >
                          <Icon name={exp.status === "Published" ? "eye-off" : "eye"} size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(exp.id)}
                          title="Supprimer"
                          style={{ color: "#e74c3c" }}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => {
          setShowForm(false)
          setSelectedExperience(null)
        }}>
          <ExperienceForm
            experience={selectedExperience}
            onClose={() => {
              setShowForm(false)
              setSelectedExperience(null)
            }}
            onSave={handleSave}
            notify={notify}
          />
        </div>
      )}
    </>
  )
}
