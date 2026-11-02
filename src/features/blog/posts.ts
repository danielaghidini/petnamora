export type BlogSection = {
  id: string;
  title: string;
  paragraphs: string[];
  tips?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  category: "Curiosidades" | "Dicas" | "Convivência";
  excerpt: string;
  publishedAt: string;
  image: string;
  imageAlt: string;
  intro: string;
  sections: BlogSection[];
  sources: { title: string; url: string }[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "por-que-cachorros-inclinam-a-cabeca",
    title: "Por que os cachorros inclinam a cabeça quando falamos com eles?",
    category: "Curiosidades",
    excerpt: "Aquela viradinha irresistível pode ter relação com a atenção. Veja o que a ciência já investigou sobre esse jeitinho.",
    publishedAt: "2026-11-02",
    image: "/blog/cabeca-inclinada.webp",
    imageAlt: "Cachorro caramelo e branco com a cabeça levemente inclinada em uma sala iluminada",
    intro: "Você diz uma palavra conhecida, seu cachorro vira a cabecinha e pronto: fica difícil continuar a conversa sem sorrir. A cena é familiar para muitas famílias, mas sua explicação ainda não cabe em uma resposta única. Há hipóteses e estudos interessantes — e também bastante espaço para novas perguntas.",
    sections: [
      {
        id: "o-que-a-ciencia-investigou",
        title: "O que a ciência já investigou",
        paragraphs: [
          "Um estudo divulgado pela Universidade Eötvös Loránd, em 2021, observou cachorros durante pedidos para buscar brinquedos pelo nome. Naquele contexto, os que aprendiam nomes de objetos inclinaram a cabeça com maior frequência. Os pesquisadores sugeriram uma possível relação com o processamento de informações relevantes.",
          "O detalhe é o contexto: a pesquisa tratava de uma tarefa específica. Ela não demonstra que toda viradinha tem a mesma causa, nem permite usar o gesto como teste de inteligência. Seu cachorro não precisa fazer isso para estar prestando atenção em você.",
        ],
      },
      {
        id: "uma-pista-na-conversa",
        title: "Uma pista, não uma tradução completa",
        paragraphs: [
          "Também existem hipóteses relacionadas à percepção de sons e à visão do rosto de quem está falando. São possibilidades discutidas sobre o comportamento, e não uma legenda pronta para cada movimento.",
          "Vale olhar para a cena inteira: o que você falou, o que estava acontecendo e como seu cachorro se comportou em seguida. Ele foi até a porta? Procurou um brinquedo? Continuou descansando? Esse conjunto conta mais sobre aquele momento do que uma foto isolada.",
        ],
      },
      {
        id: "observe-sem-forcar",
        title: "Uma curiosidade para observar juntos",
        paragraphs: [
          "Na próxima conversa, observe sem insistir em provocar uma reação. Você pode anotar quais palavras e situações chamam a atenção do seu xodó. Não é um experimento científico; é só um jeito carinhoso de conhecer melhor a rotina de vocês.",
          "Uma inclinação persistente ou uma mudança inesperada no jeito de manter a cabeça merece avaliação veterinária. O gesto passageiro durante uma interação e uma alteração contínua não devem ser interpretados da mesma forma.",
        ],
      },
    ],
    sources: [
      { title: "Universidade Eötvös Loránd — Talk-to-tilt: head tilting in dogs", url: "https://ttk.elte.hu/en/talk-to-tilt-head-tilting-in-dogs" },
      { title: "American Kennel Club — Why Do Dogs Tilt Their Heads?", url: "https://www.akc.org/expert-advice/health/why-do-dogs-tilt-their-heads/" },
    ],
  },
  {
    slug: "brincadeiras-com-cachorro-em-dias-de-chuva",
    title: "Dia de chuva? 4 brincadeiras para fazer com seu cachorro em casa",
    category: "Dicas",
    excerpt: "Uma pausa na chuva pode virar um momento gostoso juntos. Ideias simples, com espaço para brincar e descansar.",
    publishedAt: "2026-11-02",
    image: "/blog/brincadeiras.webp",
    imageAlt: "Cachorro preto e branco brincando com um brinquedo lilás sobre um tapete em casa",
    intro: "A previsão virou, o passeio precisou esperar e seu companheiro apareceu com um brinquedo na boca. Antes de transformar a sala em pista de corrida, dá para escolher atividades tranquilas que caibam no espaço e no jeitinho dele. A ideia é aproveitar a companhia, sem precisar inventar uma programação sem fim.",
    sections: [
      {
        id: "prepare-o-espaco",
        title: "Primeiro, abra espaço para a diversão",
        paragraphs: ["Afaste objetos frágeis, evite pisos escorregadios e escolha brinquedos próprios para o tamanho do seu cachorro. Acompanhe a brincadeira do começo ao fim. Se usar recompensas de comida, reserve uma pequena parte da alimentação habitual e respeite eventuais restrições orientadas pelo veterinário."],
      },
      {
        id: "quatro-ideias",
        title: "Quatro ideias para experimentar",
        paragraphs: ["Comece pela mais simples. Você pode repetir a favorita em outro dia, sem apresentar todas de uma vez."],
        tips: [
          "Cadê o brinquedo? Deixe seu cachorro ver onde você colocou um brinquedo conhecido, em um lugar fácil e acessível. Convide-o a procurar. Quando ele entender, tente um esconderijo um pouquinho menos óbvio, sem bloquear a passagem.",
          "Procura-procura: distribua algumas porções pequenas da ração em pontos limpos e seguros de uma área delimitada. Deixe que ele fareje e encontre, sem pressa. Não esconda comida perto de fios, produtos de limpeza ou móveis que ele precise escalar.",
          "Vem cá: com duas pessoas em lados próximos da sala, chamem o cachorro alternadamente e recompensem a aproximação. Mantenham o caminho livre e a distância confortável. Também dá para brincar sozinho, mudando de lugar entre as chamadas.",
          "Revisão dos favoritos: pratique uma habilidade que ele já conhece, como sentar ou tocar sua mão com o focinho. Faça poucas repetições e termine com uma interação de que ele goste. O objetivo é se divertir, sem cobrar uma apresentação perfeita.",
        ],
      },
      {
        id: "hora-da-pausa",
        title: "O descanso também faz parte",
        paragraphs: [
          "Se ele perder o interesse, deixe a atividade terminar. Uma brincadeira curta e agradável já pode render um bom momento. Não é preciso mantê-lo ocupado durante toda a tarde só porque está chovendo.",
          "Essas ideias complementam a rotina. As necessidades de passeio, movimento e saídas para fazer as necessidades continuam dependendo de cada cachorro e das condições do dia. Ajuste tudo à idade, à saúde e às preferências do seu companheiro.",
        ],
      },
    ],
    sources: [
      { title: "PDSA — Fun games for dogs at home", url: "https://www.pdsa.org.uk/what-we-do/blog/fun-games-for-dogs-at-home" },
      { title: "Greencross Vets — Keeping your dog entertained inside", url: "https://www.greencrossvets.com.au/pet-library/articles-of-interest/keeping-your-dog-entertained-inside-when-its-raining-out-2/" },
    ],
  },
  {
    slug: "deixe-seu-cachorro-farejar-no-passeio",
    title: "O passeio também é do focinho: deixe seu cachorro farejar",
    category: "Convivência",
    excerpt: "Nem todo passeio precisa render quilômetros. Algumas pausas ajudam seu companheiro a explorar o caminho.",
    publishedAt: "2026-11-02",
    image: "/blog/passeio.webp",
    imageAlt: "Cachorro caramelo de peitoral lilás farejando a grama junto a um caminho arborizado",
    intro: "Você sai pensando em completar uma volta no quarteirão. Seu cachorro, por outro lado, encontra um ponto interessantíssimo logo na primeira árvore. Para a família pode parecer uma demora, mas explorar cheiros faz parte da experiência dele. Vale reservar espaço para esses interesses na caminhada.",
    sections: [
      {
        id: "mais-que-distancia",
        title: "O caminho tem mais coisas que a distância",
        paragraphs: [
          "A PDSA recomenda oferecer oportunidades para que cachorros farejem e explorem nos passeios. O exercício diário pode combinar caminhada, brincadeiras e atividades adequadas a cada animal; não há um único formato que sirva para todos.",
          "Na prática, isso pode ser tão simples quanto escolher um trecho tranquilo e permitir algumas paradas. Você continua responsável pela segurança, enquanto seu companheiro ganha tempo para investigar o ambiente.",
        ],
      },
      {
        id: "um-passeio-com-pausas",
        title: "Como abrir espaço para as pausas",
        paragraphs: ["Experimente ajustar um passeio que vocês já fazem, em vez de criar um desafio novo. Observe como seu cachorro responde e mude o plano quando necessário."],
        tips: [
          "Escolha um trecho seguro, afastado do trânsito e sem lixo, plantas perigosas ou objetos que possam ser engolidos.",
          "Mantenha a guia e o equipamento habitual bem ajustados. Dar tempo para farejar não exige soltar seu cachorro em um local aberto.",
          "Faça algumas paradas onde houver espaço. Evite puxá-lo continuamente para cumprir um ritmo que só faz sentido para você.",
          "Se o local estiver cheio ou desconfortável, procure uma alternativa mais tranquila. O roteiro pode mudar no meio do caminho.",
        ],
      },
      {
        id: "o-ritmo-de-voces",
        title: "Encontre o ritmo de vocês",
        paragraphs: [
          "Em um dia corrido, talvez só caiba o percurso conhecido. Em outro, pode haver tempo para explorar uma rua diferente. Um plano flexível permite atender tanto à rotina da família quanto às preferências do cachorro.",
          "Farejar não precisa substituir todo o movimento, nem virar uma obrigação em cada parada. Pense nessas pausas como parte do passeio. Se houver dúvida sobre intensidade ou duração de exercício, o veterinário que acompanha seu cachorro pode orientar a adaptação.",
          "Na próxima volta, repare em quais lugares ele gosta de investigar. Você talvez descubra que o ponto alto da caminhada está em um cantinho pelo qual costumava passar depressa.",
        ],
      },
    ],
    sources: [
      { title: "PDSA — How to exercise your dog", url: "https://www.pdsa.org.uk/get-involved/our-campaigns/weigh-up/your-dog/your-dogs-body-shape/how-to-exercise-your-dog" },
    ],
  },
  {
    slug: "fotos-do-cachorro-com-celular",
    title: "Como tirar fotos do seu cachorro com o celular sem perder o jeitinho dele",
    category: "Dicas",
    excerpt: "Luz, enquadramento e um pouco de paciência: um guia para guardar os momentos e caprichar no perfil do seu xodó.",
    publishedAt: "2026-11-02",
    image: "/blog/fotografia.webp",
    imageAlt: "Cachorro branco e caramelo posando naturalmente diante de um celular em uma sala clara",
    intro: "Na sua frente está a expressão mais fofa do mundo. Na galeria, aparece um borrão com orelhas. Fotografar um cachorro que tem seus próprios planos pede menos pose e mais observação. Algumas mudanças simples no lugar e no jeito de segurar o celular já ajudam a tentar de novo.",
    sections: [
      {
        id: "luz-e-altura",
        title: "Comece pela luz e pela altura",
        paragraphs: [
          "Procure um lugar com luz suave, como uma área próxima da janela ou uma sombra clara ao ar livre. Observe se o rosto do cachorro aparece bem, em vez de ficar escuro diante de um fundo muito iluminado.",
          "Depois, abaixe o celular até perto da altura dos olhos dele. Essa mudança de ponto de vista aproxima quem vê a foto do mundo do seu companheiro. Antes de clicar, confira também o que entrou no fundo: um pequeno passo para o lado pode tirar uma distração do enquadramento.",
        ],
      },
      {
        id: "olhar-e-movimento",
        title: "Acompanhe o olhar, aceite o movimento",
        paragraphs: [
          "Toque na tela sobre o rosto para indicar o foco, conforme os recursos do seu aparelho. Faça algumas imagens e confira se os olhos ficaram nítidos. Se ele estiver se mexendo, experimente o modo de sequência do celular e escolha depois a expressão de que mais gostou.",
          "Não precisa pedir que ele olhe para a câmera o tempo todo. Um cochilo no cantinho favorito, a atenção a um brinquedo e uma pausa no passeio também contam a história dele. Guarde espaço para fotos espontâneas.",
        ],
      },
      {
        id: "ensaio-sem-cobranca",
        title: "Um ensaio curtinho, no tempo dele",
        paragraphs: [
          "Escolha um momento em que ele já esteja à vontade. Evite segurar o rosto, obrigá-lo a ficar em uma posição ou usar sons que o assustem para conseguir uma reação. Quando perder o interesse, faça uma pausa. A foto pode esperar.",
          "Antes de publicar, confira se aparecem endereço, documentos, telefone em uma plaquinha ou pessoas que não querem estar na imagem. Um corte simples pode preservar a foto e a privacidade da família.",
        ],
      },
      {
        id: "foto-para-o-perfil",
        title: "Vai escolher uma foto para o Pet Namora?",
        paragraphs: [
          "Use uma imagem atual em que seja fácil reconhecer seu cachorro. Um retrato do rosto pode ser a capa, acompanhado de fotos que mostrem o corpo e seu jeitinho no dia a dia. Prefira ajustes leves de luz a filtros que mudem as cores ou a aparência dele.",
          "O objetivo não é conseguir uma foto de catálogo. É apresentar o companheiro que a outra família vai conhecer, com o charme que ele já tem.",
        ],
      },
    ],
    sources: [
      { title: "Nikon — Following the Hounds…and Cats, Penguins, Skunks", url: "https://www.nikonusa.com/learn-and-explore/c/ideas-and-inspiration/following-the-hounds-and-cats-penguins-skunks" },
      { title: "Nikon — Through the Eyes of a Child", url: "https://www.nikonusa.com/learn-and-explore/c/ideas-and-inspiration/through-the-eyes-of-a-child" },
    ],
  },
];

export type BlogPostSummary = Pick<BlogPost, "slug" | "title" | "category" | "excerpt" | "publishedAt" | "image" | "imageAlt"> & { readingMinutes: number };

export function readingMinutes(post: BlogPost) {
  const text = [post.intro, ...post.sections.flatMap(section => [...section.paragraphs, ...(section.tips ?? [])])].join(" ");
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}

export function postSummary(post: BlogPost): BlogPostSummary {
  return {
    slug: post.slug, title: post.title, category: post.category, excerpt: post.excerpt,
    publishedAt: post.publishedAt, image: post.image, imageAlt: post.imageAlt,
    readingMinutes: readingMinutes(post),
  };
}

export function findPost(slug: string) {
  return blogPosts.find(post => post.slug === slug);
}

export function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
