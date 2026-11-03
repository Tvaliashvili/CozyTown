import { createContext, useContext, useEffect, useState } from 'react'
import ka from './ka.js'
import en from './en.js'

// Starts with the landing page's texts only. loadAppTexts() adds the rest.
const dictionaries = { ka: { ...ka }, en: { ...en } }
const I18nContext = createContext(null)

// The texts for every other page are a separate download, so the landing page stays small on budget phones.
// Every page except the landing page waits for this before it shows (lazyPage in App.jsx).
let appTexts = null
export function loadAppTexts() {
  appTexts ??= Promise.all([import('./ka-app.js'), import('./en-app.js')]).then(([kaApp, enApp]) => {
    Object.assign(dictionaries.ka, kaApp.default)
    Object.assign(dictionaries.en, enApp.default)
  })
  return appTexts
}

// localStorage can be blocked (private browsing), so every access is wrapped in try/catch.
function loadLanguage() {
  try {
    return localStorage.getItem('lang') || 'ka'
  } catch {
    return 'ka'
  }
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(loadLanguage)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  function setLang(next) {
    setLangState(next)
    try {
      localStorage.setItem('lang', next)
    } catch {}
  }

  // Falls back to English, then to the key itself, so a missing translation never shows up blank.
  function t(key) {
    return dictionaries[lang][key] ?? dictionaries.en[key] ?? key
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
