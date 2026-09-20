const localizeSafetyKnowledgeTopic = (topic, language = 'en') => {
  const {
    title, titleKm, category, categoryKm, shortDescription, shortDescriptionKm,
    content, contentKm, warningSigns, warningSignsKm, preventionTips, preventionTipsKm,
    indicators, indicatorsKm, ...shared
  } = topic
  const useKhmer = language === 'km'
  return {
    ...shared,
    title: useKhmer ? titleKm : title,
    category: useKhmer ? categoryKm : category,
    shortDescription: useKhmer ? shortDescriptionKm : shortDescription,
    content: useKhmer ? contentKm : content,
    warningSigns: useKhmer ? warningSignsKm : warningSigns,
    preventionTips: useKhmer ? preventionTipsKm : preventionTips,
    indicators: useKhmer ? indicatorsKm : indicators,
  }
}

export default localizeSafetyKnowledgeTopic
