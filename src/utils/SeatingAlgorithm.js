import OpenAI from 'openai';
import { Desk } from '../models/Desk';

/**
 * Рассадка студентов по партам с помощью OpenAI API
 *
 * @param {Array} students - Массив всех студентов для рассадки
 * @param {Array} currentDesks - Текущий массив парт (используется для определения количества)
 * @returns {Promise<Array>} Массив парт с размещенными студентами
 */
export const arrangeStudents = async (students, currentDesks) => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('API ключ OpenAI не настроен. Добавьте REACT_APP_OPENAI_API_KEY в файл .env');
  }

  const columnCount = 3;
  const rowCount = Math.ceil(currentDesks.length / columnCount);
  const totalDesks = rowCount * columnCount;

  // Формируем данные учеников для промта
  const studentsData = students.map(s => ({
    name: s.getFullName(),
    vision: s.getVision(),
    height: s.getHeight(),
    conflicts: Array.from(s.getConflicts()).map(c => c.getFullName()),
    preferredNeighbors: Array.from(s.getPreferredNeighbors()).map(p => p.getFullName()),
  }));

  // Сортируем учеников по росту для подсказки AI
  const sortedByHeight = [...studentsData].sort((a, b) => a.height - b.height);
  const heightList = sortedByHeight.map(s => `${s.name}: ${s.height}см`).join(', ');

  // Находим учеников с плохим зрением и высоким ростом (топ-30% самых высоких среди плоховидящих)
  const badVisionStudents = studentsData.filter(s => s.vision === 'Плохое');
  let tallBadVisionNote = '';
  if (badVisionStudents.length > 0) {
    const badVisionHeights = badVisionStudents.map(s => s.height).sort((a, b) => b - a);
    const topCount = Math.max(2, Math.ceil(badVisionStudents.length * 0.3));
    const heightThreshold = badVisionHeights[Math.min(topCount - 1, badVisionHeights.length - 1)];
    const tallBadVision = badVisionStudents.filter(s => s.height >= heightThreshold).map(s => s.name);
    if (tallBadVision.length > 0) {
      tallBadVisionNote = `\nОСОБАЯ ГРУППА — ученики с плохим зрением И высоким ростом (≥${heightThreshold}см): ${tallBadVision.join(', ')}. Их нужно посадить в ПЕРВЫЙ ряд, но ТОЛЬКО по краям (парта 0 — место student1, парта 2 — место student2). Максимум 3 человека на каждый край.`;
    }
  }

  const prompt = `Ты — алгоритм рассадки учеников в классе. Класс: ${columnCount} колонки × ${rowCount} рядов = ${totalDesks} парт. Каждая парта — 2 места (student1 слева, student2 справа). Нумерация парт слева направо, сверху вниз: парты 0,1,2 = ряд 1 (ближайший к доске), парты 3,4,5 = ряд 2, и т.д.

Колонки: левая (парты 0,3,6,...), центральная (парты 1,4,7,...), правая (парты 2,5,8,...).

=== СТРОГИЕ ПРАВИЛА (нарушать НЕЛЬЗЯ) ===

1. РОСТ → РЯД: Ученики ДОЛЖНЫ быть рассажены по росту — самые низкие в первых рядах, самые высокие в последних. Это главное правило! Вот ученики по возрастанию роста: ${heightList}. Распредели их по рядам соответственно — низкие вперёд, высокие назад.

2. КОНФЛИКТЫ: Конфликтующие ученики НЕ ДОЛЖНЫ сидеть за одной партой.

=== ПРИОРИТЕТНЫЕ ПРАВИЛА ===

3. ЗРЕНИЕ: Ученики с плохим зрением ("Плохое") должны сидеть как можно ближе к доске (в первых рядах). Это важнее правила роста — ученик с плохим зрением сдвигается на 1-2 ряда вперёд даже если он выше соседей.
${tallBadVisionNote}

4. ВЫСОКИЕ ПО КРАЯМ: Если высокий ученик вынужден сидеть не в последних рядах (например, из-за плохого зрения), посади его по краям (левая или правая колонка), чтобы он не загораживал другим обзор доски.

=== МЯГКИЕ ПРАВИЛА ===

5. ЖЕЛАЕМЫЕ СОСЕДИ: По возможности сажай желаемых соседей за одну парту, но не в ущерб строгим правилам.

Данные учеников:
${JSON.stringify(studentsData, null, 2)}

Верни ТОЛЬКО JSON:
{
  "desks": [
    { "student1": "Имя ученика" или null, "student2": "Имя ученика" или null },
    ...
  ]
}

Ровно ${totalDesks} парт. Каждый ученик ровно один раз. Пустые места = null.`;

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);

  if (!parsed.desks || !Array.isArray(parsed.desks)) {
    throw new Error('Некорректный ответ от OpenAI: отсутствует массив desks');
  }

  // Создаём карту имён → объектов Student
  const studentMap = new Map();
  students.forEach(s => studentMap.set(s.getFullName(), s));

  // Создаём массив парт из ответа
  const desks = parsed.desks.map(deskData => {
    const desk = new Desk();
    if (deskData.student1) {
      const s = studentMap.get(deskData.student1);
      if (s) desk.setStudent1(s);
    }
    if (deskData.student2) {
      const s = studentMap.get(deskData.student2);
      if (s) desk.setStudent2(s);
    }
    return desk;
  });

  // Если парт меньше чем нужно, дополняем пустыми
  while (desks.length < totalDesks) {
    desks.push(new Desk());
  }

  return desks;
};
