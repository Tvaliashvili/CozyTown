import { createContext, useContext, useEffect, useState } from 'react'
import ka from './ka.js'
import en from './en.js'

const dictionaries = { ka, en }
const I18nContext = createContext(null)

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
    return dictionaries[lang][key] ?? en[key] ?? key
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
