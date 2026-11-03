import { useEffect, useState } from 'react'
import StreetView from './StreetView.jsx'
import HouseTown from './HouseTown.jsx'
import { loadDesign, saveDesign, MY_PLOT, NEIGHBOURS } from './data/design.js'
import { useI18n } from './i18n/i18n.jsx'

// houseCode set: someone's real house from the database (/h/<code>).
// houseCode null: the demo street (/town), where anyone can try decorating.
export default function TownApp({ houseCode }) {
  return houseCode === null ? <DemoTown /> : <HouseTown code={houseCode} />
}

// The demo house is saved in this browser only, so trying it out needs no account.
function DemoTown() {
  const { t } = useI18n()
  const [design, setDesign] = useState(loadDesign)

  // Every change is saved straight away, so nothing is lost on reload.
  useEffect(() => {
    saveDesign(design)
  }, [design])

  return (
    <StreetView
      plot={MY_PLOT}
      design={design}
      neighbours={NEIGHBOURS}
      onChange={setDesign}
      canEdit
      label={{ title: t('yourHouse'), text: t('tapToDecorate') }}
    />
  )
}
