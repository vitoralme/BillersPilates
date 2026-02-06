import { GoogleGenAI, Type } from "@google/genai";
import { AIClassPlan } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateClassPlan = async (
  focus: string, 
  level: string, 
  type: 'Mat' | 'Apparatus', 
  equipment: string[]
): Promise<AIClassPlan | null> => {
  try {
    let promptContext = "";
    
    if (type === 'Mat') {
      promptContext = "de Mat Pilates (Solo), utilizando apenas o peso do corpo ou acessórios pequenos";
    } else {
      const equipmentList = equipment.length > 0 ? equipment.join(', ') : "aparelhos diversos";
      promptContext = `de Pilates nos seguintes aparelhos: ${equipmentList}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Crie um plano de aula completo ${promptContext}.
      
      Foco da aula: "${focus}"
      Nível dos alunos: "${level}"
      
      A resposta deve ser estruturada em JSON contendo título criativo, duração estimada, nível e uma lista de 5 a 6 exercícios principais com repetições e notas técnicas de execução específicas para o equipamento (ou solo) utilizado.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            duration: { type: Type.STRING },
            level: { type: Type.STRING },
            exercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  reps: { type: Type.STRING },
                  notes: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIClassPlan;
    }
    return null;
  } catch (error) {
    console.error("Erro ao gerar plano de aula:", error);
    return null;
  }
};