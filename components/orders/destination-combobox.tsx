'use client'

import { useId } from 'react'

const boliviaDestinations = [
  'La Paz',
  'El Alto',
  'Cochabamba',
  'Santa Cruz de la Sierra',
  'Sucre',
  'Oruro',
  'Potosí',
  'Tarija',
  'Trinidad',
  'Cobija',
  'Quillacollo',
  'Sacaba',
  'Montero',
  'Warnes',
  'Camiri',
  'Yacuiba',
  'Villamontes',
  'Bermejo',
  'Riberalta',
  'Guayaramerín',
  'Uyuni',
  'Tupiza',
  'Llallagua',
  'Viacha',
  'Achocalla',
  'Copacabana',
  'Caranavi',
  'Challapata',
  'Punata',
  'Tiquipaya',
  'Departamento de La Paz',
  'Departamento de Cochabamba',
  'Departamento de Santa Cruz',
  'Departamento de Chuquisaca',
  'Departamento de Oruro',
  'Departamento de Potosí',
  'Departamento de Tarija',
  'Departamento del Beni',
  'Departamento de Pando',
] as const

type DestinationComboboxProps = {
  value: string
  onChange: (value: string) => void
}

export function DestinationCombobox({ value, onChange }: DestinationComboboxProps) {
  const listId = useId()
  const inputId = useId()

  return (
    <div>
      <label htmlFor={inputId} className="field-label">Destino del envío</label>
      <input
        id={inputId}
        type="text"
        list={listId}
        placeholder="Buscar ciudad, departamento o localidad"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-control"
        autoComplete="off"
        required
      />
      <datalist id={listId}>
        {boliviaDestinations.map((destination) => (
          <option key={destination} value={destination} />
        ))}
      </datalist>
      <p className="field-help">
        Selecciona una sugerencia o escribe otra localidad.
      </p>
    </div>
  )
}
