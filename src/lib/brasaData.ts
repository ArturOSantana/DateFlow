// ─── BRASA — Dados do jogo ────────────────────────────────────────────────────
//
// Inspirado em: We're Not Really Strangers, 36 Questions to Fall in Love (Arthur Aron),
// Esther Perel's work on desire & intimacy, Gottman's Love Maps.
//
// Modo: assíncrono, cada jogador no próprio celular.
// Sem emojis nas cartas ou na UI.

export type Act = 1 | 2 | 3 | 'bonus'

export type CardMechanic = 'vote'    // Ambos votam sem ver a resposta um do outro

export type HeatLevel = 'warm' | 'hot' | 'fire'

export interface BrasaCard {
  id: string
  act: Act
  mechanic: CardMechanic
  heat: HeatLevel
  text: string
  /** Instrução exibida abaixo da carta */
  how: string
  pts: number
}

export interface WildCard {
  id: string
  title: string
  effect: string
  pts: number
}

export interface FinalChallenge {
  id: string
  text: string
}

// ─── ATO 1 — Superfície ───────────────────────────────────────────────────────

export const ACT1: BrasaCard[] = [
  {
    id: 'a1_01', act: 1, mechanic: 'vote', heat: 'warm', pts: 8,
    text: 'Qual é a coisa mais estranha que você já fez para impressionar alguém?',
    how: 'Cada um digita sua resposta. Ela fica oculta até o outro também enviar.',
  },
  {
    id: 'a1_02', act: 1, mechanic: 'vote', heat: 'warm', pts: 6,
    text: 'Se você soubesse que não poderia falhar, o que tentaria fazer?',
    how: 'Quem recebeu a carta responde. O outro lê e pode comentar.',
  },
  {
    id: 'a1_03', act: 1, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Quem entre vocês dois quebraria as regras primeiro num jogo de tabuleiro?',
    how: 'Cada um vota. Os votos ficam ocultos até os dois enviarem.',
  },
  {
    id: 'a1_04', act: 1, mechanic: 'vote', heat: 'warm', pts: 6,
    text: 'Qual foi o momento em que você se sentiu mais ridículo(a) — e hoje acha graça?',
    how: 'Quem recebeu a carta responde. O outro pode reagir depois.',
  },
  {
    id: 'a1_05', act: 1, mechanic: 'vote', heat: 'warm', pts: 8,
    text: 'Qual app no seu celular você teria vergonha que o outro visse agora?',
    how: 'Cada um digita. Respostas ficam ocultas até os dois enviarem.',
  },
  {
    id: 'a1_06', act: 1, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Quem entre vocês demoraria mais para pedir socorro se estivesse perdido?',
    how: 'Cada um vota. Os votos ficam ocultos até os dois enviarem.',
  },
  {
    id: 'a1_07', act: 1, mechanic: 'vote', heat: 'warm', pts: 6,
    text: 'Qual é o seu "guilty pleasure" que você nunca admite publicamente?',
    how: 'Quem recebeu a carta responde. Sem julgamento.',
  },
  {
    id: 'a1_08', act: 1, mechanic: 'vote', heat: 'warm', pts: 8,
    text: 'O que você fazia às 3 da manhã nos seus melhores anos?',
    how: 'Cada um digita. Revelam ao mesmo tempo.',
  },
  {
    id: 'a1_09', act: 1, mechanic: 'vote', heat: 'warm', pts: 6,
    text: 'Qual é a opinião impopular que você tem e não costuma contar pra muita gente?',
    how: 'Quem recebeu a carta responde. O outro pode concordar ou discordar.',
  },
  {
    id: 'a1_10', act: 1, mechanic: 'vote', heat: 'warm', pts: 8,
    text: 'Em uma palavra: como você descreveria essa fase da sua vida agora?',
    how: 'Cada um digita uma palavra. Revelam ao mesmo tempo.',
  },
  {
    id: 'a1_11', act: 1, mechanic: 'vote', heat: 'warm', pts: 8,
    text: 'Qual música, quando toca, te leva imediatamente para algum lugar ou memória?',
    how: 'Cada um escreve a música e o que ela evoca. Revelam ao mesmo tempo.',
  },
  {
    id: 'a1_12', act: 1, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Quem entre vocês dois demoraria mais para admitir que está errado numa discussão?',
    how: 'Cada um vota. Os votos ficam ocultos até os dois enviarem.',
  },
  {
    id: 'a1_13', act: 1, mechanic: 'vote', heat: 'warm', pts: 6,
    text: 'Qual foi o pior conselho que você já seguiu — e o que aconteceu?',
    how: 'Quem recebeu a carta responde. O outro pode reagir depois.',
  },
  {
    id: 'a1_14', act: 1, mechanic: 'vote', heat: 'warm', pts: 8,
    text: 'Se você pudesse ser especialista em qualquer coisa da noite para o dia, o que escolheria?',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a1_15', act: 1, mechanic: 'vote', heat: 'warm', pts: 6,
    text: 'Qual é o hábito que você sabe que deveria largar mas não consegue?',
    how: 'Quem recebeu a carta responde sem se defender. O outro só escuta.',
  },
  {
    id: 'a1_16', act: 1, mechanic: 'vote', heat: 'warm', pts: 8,
    text: 'Qual é a coisa mais impulsiva que você já fez — e não se arrependeu?',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a1_17', act: 1, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Quem entre vocês ficaria mais ansioso esperando uma resposta importante?',
    how: 'Cada um vota. Os votos ficam ocultos até os dois enviarem.',
  },
  {
    id: 'a1_18', act: 1, mechanic: 'vote', heat: 'warm', pts: 6,
    text: 'Qual é a coisa que você sente falta da sua versão de 10 anos atrás?',
    how: 'Quem recebeu a carta responde. O outro pode perguntar mais.',
  },
  {
    id: 'a1_19', act: 1, mechanic: 'vote', heat: 'warm', pts: 8,
    text: 'O que você faz quando precisa se recuperar de um dia muito ruim?',
    how: 'Cada um escreve o ritual. Revelam ao mesmo tempo.',
  },
  {
    id: 'a1_20', act: 1, mechanic: 'vote', heat: 'warm', pts: 6,
    text: 'Se você fosse descrever seu jeito de amar em um objeto, qual seria?',
    how: 'Quem recebeu a carta responde e explica a metáfora.',
  },
]

// ─── ATO 2 — Profundeza ───────────────────────────────────────────────────────

export const ACT2: BrasaCard[] = [
  {
    id: 'a2_01', act: 2, mechanic: 'vote', heat: 'warm', pts: 12,
    text: 'Qual foi o momento da sua vida em que você mais precisou de alguém — e essa pessoa estava lá?',
    how: 'Cada um escreve. Respostas ficam ocultas até os dois enviarem.',
  },
  {
    id: 'a2_02', act: 2, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'O que você ainda não me contou sobre você que talvez eu precisasse saber?',
    how: 'Quem recebeu a carta responde com honestidade. O outro só lê, sem interromper.',
  },
  {
    id: 'a2_03', act: 2, mechanic: 'vote', heat: 'warm', pts: 15,
    text: 'Qual de vocês cai mais fundo quando está apaixonado?',
    how: 'Cada um vota. Oculto até os dois enviarem. Depois cada um explica.',
  },
  {
    id: 'a2_04', act: 2, mechanic: 'vote', heat: 'hot', pts: 14,
    text: 'O que você mais admira em mim que nunca disse diretamente?',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a2_05', act: 2, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Se você pudesse mudar uma coisa no jeito como cresceu, o que seria?',
    how: 'Quem recebeu a carta responde. O outro pode fazer uma pergunta depois.',
  },
  {
    id: 'a2_06', act: 2, mechanic: 'vote', heat: 'warm', pts: 12,
    text: 'Qual foi a última vez que você chorou — e por que?',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a2_07', act: 2, mechanic: 'vote', heat: 'hot', pts: 10,
    text: 'Quando você percebeu que queria algo mais comigo — e o que estava sentindo naquele momento?',
    how: 'Quem recebeu a carta responde. O outro lê em silêncio primeiro.',
  },
  {
    id: 'a2_08', act: 2, mechanic: 'vote', heat: 'warm', pts: 12,
    text: 'Complete: "Eu finjo que não preciso de... mas na verdade preciso muito."',
    how: 'Cada um completa a frase. Revelam ao mesmo tempo.',
  },
  {
    id: 'a2_09', act: 2, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Qual é o medo que você não costuma admitir em voz alta?',
    how: 'Quem recebeu a carta responde. Sem minimizar.',
  },
  {
    id: 'a2_10', act: 2, mechanic: 'vote', heat: 'hot', pts: 15,
    text: 'Quem entre vocês é mais difícil de ler emocionalmente?',
    how: 'Cada um vota. Oculto até os dois enviarem. Discutam depois.',
  },
  {
    id: 'a2_11', act: 2, mechanic: 'vote', heat: 'hot', pts: 14,
    text: 'O que eu faço — sem saber — que te faz gostar ainda mais de mim?',
    how: 'Cada um escreve. Revelam ao mesmo tempo. Guardem essa resposta.',
  },
  {
    id: 'a2_12', act: 2, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Qual é a versão de você que eu ainda não vi — e que existe?',
    how: 'Quem recebeu a carta responde com honestidade.',
  },
  {
    id: 'a2_13', act: 2, mechanic: 'vote', heat: 'warm', pts: 12,
    text: 'Qual foi a decisão mais difícil que você tomou sozinho — e como você se sente em relação a ela hoje?',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a2_14', act: 2, mechanic: 'vote', heat: 'hot', pts: 10,
    text: 'O que você precisa que eu saiba sobre como você funciona quando está com raiva?',
    how: 'Quem recebeu a carta responde com honestidade. O outro não pode se defender agora.',
  },
  {
    id: 'a2_15', act: 2, mechanic: 'vote', heat: 'warm', pts: 15,
    text: 'Quem entre vocês carrega mais coisas não ditas por medo de machucar o outro?',
    how: 'Cada um vota. Oculto até os dois enviarem. Discutam depois com gentileza.',
  },
  {
    id: 'a2_16', act: 2, mechanic: 'vote', heat: 'hot', pts: 14,
    text: 'Complete: "Eu me sinto mais amado(a) por você quando..."',
    how: 'Cada um completa a frase. Revelam ao mesmo tempo. Guardem a resposta.',
  },
  {
    id: 'a2_17', act: 2, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Qual é o momento da nossa história que mais te orgulha — não de mim, mas de você mesmo(a)?',
    how: 'Quem recebeu a carta responde com detalhe.',
  },
  {
    id: 'a2_18', act: 2, mechanic: 'vote', heat: 'warm', pts: 12,
    text: 'O que você gostaria de ter feito diferente nos seus relacionamentos anteriores?',
    how: 'Cada um escreve com honestidade. Revelam ao mesmo tempo.',
  },
  {
    id: 'a2_19', act: 2, mechanic: 'vote', heat: 'hot', pts: 10,
    text: 'Qual é a coisa que você faz quando quer atenção mas não consegue pedi-la diretamente?',
    how: 'Quem recebeu a carta responde. O outro reconhece sem tirar sarro.',
  },
  {
    id: 'a2_20', act: 2, mechanic: 'vote', heat: 'hot', pts: 14,
    text: 'Se você pudesse me pedir uma coisa para mudar no jeito como nos relacionamos, qual seria?',
    how: 'Cada um escreve com cuidado. Revelam ao mesmo tempo. Sem julgamento.',
  },
  {
    id: 'a2_21', act: 2, mechanic: 'vote', heat: 'warm', pts: 10,
    text: 'Qual é a sua maior insegurança dentro de um relacionamento?',
    how: 'Quem recebeu a carta responde. O outro ouve sem tentar consertar.',
  },
  {
    id: 'a2_22', act: 2, mechanic: 'vote', heat: 'hot', pts: 15,
    text: 'Quem entre vocês é mais provável de guardar mágoa sem falar nada por dias?',
    how: 'Cada um vota. Oculto até os dois enviarem. Depois cada um explica.',
  },
]

// ─── ATO 3 — Brasa ────────────────────────────────────────────────────────────

export const ACT3: BrasaCard[] = [
  {
    id: 'a3_01', act: 3, mechanic: 'vote', heat: 'hot', pts: 16,
    text: 'Qual foi o momento, depois que nos conhecemos, em que você mais sentiu atração por mim?',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a3_02', act: 3, mechanic: 'vote', heat: 'hot', pts: 14,
    text: 'O que eu faço — consciente ou não — que te deixa mais atraído por mim?',
    how: 'Quem recebeu a carta responde com detalhe.',
  },
  {
    id: 'a3_03', act: 3, mechanic: 'vote', heat: 'hot', pts: 18,
    text: 'Quem entre vocês tem o cenário de encontro perfeito mais elaborado na cabeça?',
    how: 'Cada um vota. Quem ganhar precisa descrever o cenário.',
  },
  {
    id: 'a3_04', act: 3, mechanic: 'vote', heat: 'fire', pts: 20,
    text: 'Como seria uma noite perfeita comigo — do começo ao fim?',
    how: 'Cada um descreve em 3 frases. Revelam. Comparam.',
  },
  {
    id: 'a3_05', act: 3, mechanic: 'vote', heat: 'hot', pts: 18,
    text: 'Descrevam um ao outro em exatamente 5 palavras.',
    how: 'Cada um escreve. Revelam ao mesmo tempo. Instinto, sem pensar demais.',
  },
  {
    id: 'a3_06', act: 3, mechanic: 'vote', heat: 'hot', pts: 14,
    text: 'Qual é o tipo de momento que mais cria tensão boa entre nós?',
    how: 'Quem recebeu a carta responde com um exemplo específico.',
  },
  {
    id: 'a3_07', act: 3, mechanic: 'vote', heat: 'fire', pts: 20,
    text: 'Complete: "Quando estou perto de você eu quero..."',
    how: 'Cada um completa. Revelam ao mesmo tempo. Sem filtro.',
  },
  {
    id: 'a3_08', act: 3, mechanic: 'vote', heat: 'fire', pts: 22,
    text: 'Escrevam uma mensagem um para o outro como se fosse a primeira vez que flertariam.',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a3_09', act: 3, mechanic: 'vote', heat: 'fire', pts: 16,
    text: 'Qual é a coisa que você mais gosta que eu faça — e que eu talvez nem saiba que você gosta?',
    how: 'Resposta honesta. O outro não pode fingir que já sabia.',
  },
  {
    id: 'a3_10', act: 3, mechanic: 'vote', heat: 'fire', pts: 20,
    text: 'Quem entre vocês pensa mais no outro durante o dia, sem motivo específico?',
    how: 'Cada um vota. Quem "perder" conta uma situação específica.',
  },
  {
    id: 'a3_11', act: 3, mechanic: 'vote', heat: 'fire', pts: 20,
    text: 'O que você ainda quer explorar comigo que nunca falou?',
    how: 'Pode ser qualquer coisa: uma viagem, uma experiência, um momento. Revelam ao mesmo tempo.',
  },
  {
    id: 'a3_12', act: 3, mechanic: 'vote', heat: 'hot', pts: 14,
    text: 'Qual foi o momento mais inesquecível entre nós dois — e por que esse especificamente?',
    how: 'Quem recebeu a carta responde com detalhes. O outro só lê.',
  },
  {
    id: 'a3_13', act: 3, mechanic: 'vote', heat: 'hot', pts: 16,
    text: 'Qual é a coisa que eu faço que te deixa com saudade de mim antes mesmo de eu ir embora?',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a3_14', act: 3, mechanic: 'vote', heat: 'fire', pts: 18,
    text: 'Como você gosta de ser tocado(a) quando o clima está carregado — com tensão boa?',
    how: 'Quem recebeu a carta responde com detalhe. O outro guarda essa informação.',
  },
  {
    id: 'a3_15', act: 3, mechanic: 'vote', heat: 'fire', pts: 20,
    text: 'Qual é a cena de um filme ou série que te fez pensar em mim — e por quê?',
    how: 'Cada um escreve a cena e a razão. Revelam ao mesmo tempo.',
  },
  {
    id: 'a3_16', act: 3, mechanic: 'vote', heat: 'hot', pts: 18,
    text: 'Quem entre vocês inicia mais o contato — e quem mais recebe?',
    how: 'Cada um vota. Quem "ganhar" conta como gostaria que fosse.',
  },
  {
    id: 'a3_17', act: 3, mechanic: 'vote', heat: 'fire', pts: 22,
    text: 'Complete: "A parte do seu corpo que eu mais gosto é... porque..."',
    how: 'Cada um completa sobre o outro. Revelam ao mesmo tempo. Sem filtro.',
  },
  {
    id: 'a3_18', act: 3, mechanic: 'vote', heat: 'hot', pts: 14,
    text: 'Qual é a memória física — um cheiro, uma textura, um som — que te remete a mim?',
    how: 'Quem recebeu a carta responde com detalhes sensoriais.',
  },
  {
    id: 'a3_19', act: 3, mechanic: 'vote', heat: 'fire', pts: 20,
    text: 'Se você pudesse escolher um lugar no mundo para estar comigo agora, qual seria — e o que aconteceria lá?',
    how: 'Cada um descreve. Revelam. Comparem os detalhes.',
  },
  {
    id: 'a3_20', act: 3, mechanic: 'vote', heat: 'fire', pts: 18,
    text: 'O que você pensa — mas não costuma falar — quando estamos juntos em silêncio?',
    how: 'Quem recebeu a carta responde com honestidade. O outro lê sem interromper.',
  },
  {
    id: 'a3_21', act: 3, mechanic: 'vote', heat: 'hot', pts: 16,
    text: 'Qual é o tipo de mensagem que eu poderia te mandar agora que te deixaria completamente desarmado(a)?',
    how: 'Cada um escreve. Revelam ao mesmo tempo.',
  },
  {
    id: 'a3_22', act: 3, mechanic: 'vote', heat: 'fire', pts: 20,
    text: 'Quem entre vocês perde mais a concentração quando o outro está perto?',
    how: 'Cada um vota. Quem "perder" conta em qual situação isso acontece mais.',
  },
]

// ─── Bônus ────────────────────────────────────────────────────────────────────

export const BONUS_CARDS: BrasaCard[] = [
  {
    id: 'bx_01', act: 'bonus', mechanic: 'vote', heat: 'fire', pts: 25,
    text: 'Escreva uma fantasia — pode ser um lugar, uma situação, uma experiência — que quer viver com o outro.',
    how: 'Cada um escreve. Revelam ao mesmo tempo. Sem julgamento. Guardem como ideia de date.',
  },
  {
    id: 'bx_02', act: 'bonus', mechanic: 'vote', heat: 'fire', pts: 30,
    text: 'Complete: "Quando estou com você eu sinto..." — 3 frases, sem filtro.',
    how: 'Cada um escreve as 3 frases. Revelam ao mesmo tempo.',
  },
  {
    id: 'bx_03', act: 'bonus', mechanic: 'vote', heat: 'fire', pts: 28,
    text: 'Se você pudesse viver um dia inteiro ao meu lado, como seria cada hora?',
    how: 'Cada um descreve o dia. Revelam. Comparem onde coincidem.',
  },
  {
    id: 'bx_04', act: 'bonus', mechanic: 'vote', heat: 'fire', pts: 35,
    text: 'Escreva uma coisa concreta que quer fazer comigo nos próximos 30 dias.',
    how: 'Cada um escreve. Revelam. Se coincidir, façam acontecer.',
  },
  {
    id: 'bx_05', act: 'bonus', mechanic: 'vote', heat: 'fire', pts: 28,
    text: 'Escreva um elogio sobre mim que nunca diria em voz alta por achar exagerado demais.',
    how: 'Quem recebeu a carta responde sem diminuir. O outro lê e não pode negar.',
  },
  {
    id: 'bx_06', act: 'bonus', mechanic: 'vote', heat: 'fire', pts: 32,
    text: 'Complete: "A coisa que mais me assusta no que sinto por você é..."',
    how: 'Cada um completa. Revelam ao mesmo tempo. Sem ironias.',
  },
  {
    id: 'bx_07', act: 'bonus', mechanic: 'vote', heat: 'fire', pts: 30,
    text: 'Se você pudesse guardar um único momento entre nós para relembrar para sempre, qual seria?',
    how: 'Cada um escreve. Revelam. Conversem sobre o que esse momento significa.',
  },
  {
    id: 'bx_08', act: 'bonus', mechanic: 'vote', heat: 'fire', pts: 35,
    text: 'Escreva uma promessa pequena e concreta para mim — algo que você vai fazer até a próxima semana.',
    how: 'Cada um escreve. Revelam. Cobrem um ao outro depois.',
  },
]

// ─── Wildcards ────────────────────────────────────────────────────────────────

export const WILDCARDS: WildCard[] = [
  { id: 'wc1', title: 'Inversao', effect: 'Na proxima carta, o outro jogador responde primeiro.', pts: 0 },
  { id: 'wc2', title: 'Bonus Duplo', effect: 'A proxima carta vale o dobro de pontos. Caprichem na resposta.', pts: 15 },
  { id: 'wc3', title: 'Escolha Livre', effect: 'Qualquer um dos dois escolhe a proxima pergunta. Podem pedir o que quiserem.', pts: 10 },
  { id: 'wc4', title: 'Avanca', effect: 'Pula direto para o proximo ato. O Brasa aumenta +10 de brinde.', pts: 10 },
  { id: 'wc5', title: 'So a Verdade', effect: 'Na proxima carta, respostas de uma palavra nao valem. Seja especifico.', pts: 8 },
  { id: 'wc6', title: 'Troca de Lado', effect: 'Os papeis se invertem por uma rodada: quem geralmente responde agora pergunta.', pts: 5 },
  { id: 'wc7', title: 'Sem Filtro', effect: 'Na proxima carta, a primeira coisa que vier a cabeca vale. Nao pode apagar e reescrever.', pts: 12 },
  { id: 'wc8', title: 'Pausa', effect: 'Nenhum dos dois responde agora. Fiquem 60 segundos em silencio antes de continuar.', pts: 0 },
  { id: 'wc9', title: 'Aposta', effect: 'Quem der a resposta mais surpreendente segundo o outro ganha 20 pontos extras.', pts: 20 },
  { id: 'wc10', title: 'Memoria', effect: 'Antes da proxima carta, cada um cita uma coisa que o outro disse nessa sessao que ficou marcada.', pts: 10 },
]

// ─── Desafio final ────────────────────────────────────────────────────────────

export const FINAL_CHALLENGES: FinalChallenge[] = [
  { id: 'fc1', text: 'Planejem agora o proximo encontro. Cada um escreve uma coisa que quer que aconteca nele.' },
  { id: 'fc2', text: 'Cada um escreve ao outro uma coisa que nunca disse — e manda agora.' },
  { id: 'fc3', text: 'Cada um manda uma musica que representa como se sente agora. Ouvam juntos de lados diferentes.' },
  { id: 'fc4', text: 'Cada um faz um pedido honesto ao outro para os proximos dias.' },
  { id: 'fc5', text: 'Escrevam ao mesmo tempo: "O que mais gosto em voce e..." — sem combinar antes.' },
  { id: 'fc6', text: 'Cada um descreve como se sentiria se o outro sumisse por uma semana sem avisar. Sejam honestos.' },
  { id: 'fc7', text: 'Cada um escreve uma coisa que quer aprender com o outro — algo que voce admira e ainda nao tem.' },
  { id: 'fc8', text: 'Mandem um ao outro a foto favorita que tem do outro. Expliquem por que escolheram essa.' },
  { id: 'fc9', text: 'Cada um escreve o que diria para o outro se soubesse que nao ia ver a pessoa por 30 dias.' },
  { id: 'fc10', text: 'Juntos, escolham uma data no calendario para algo que ainda nao fizeram. Marquem agora.' },
]

// ─── Utilitarios ──────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Monta o deck de um ato, embaralhado, limitado a `count` cartas */
export function buildAct(act: Act, count: number): BrasaCard[] {
  const pool =
    act === 1 ? ACT1 :
    act === 2 ? ACT2 :
    act === 3 ? ACT3 : BONUS_CARDS
  return shuffle(pool).slice(0, count)
}

/** Gera um codigo de sala de 4 letras maiusculas */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
