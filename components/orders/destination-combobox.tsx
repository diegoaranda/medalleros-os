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

  return (
    <div>
      <label className="text-sm text-muted-foreground">Destino</label>
      <input
        type="text"
        list={listId}
        placeholder="Buscar ciudad, departamento o localidad"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        autoComplete="off"
        required
      />
      <datalist id={listId}>
        {boliviaDestinations.map((destination) => (
          <option key={destination} value={destination} />
        ))}
      </datalist>
      <p className="mt-1 text-xs text-muted-foreground">
        Selecciona una sugerencia o usa “Otro destino” escribiendo el texto libremente.
      </p>
    </div>
  )
}
