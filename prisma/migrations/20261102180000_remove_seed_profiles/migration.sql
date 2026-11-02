BEGIN;

-- Only the 50 profiles explicitly created by the opt-in production fixture load.
-- Match the dog ID, owner ID and reserved email together, never names or breeds.
CREATE TEMP TABLE "PetNamoraSeedProfilesToRemove" (
  "dogId" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  email TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "PetNamoraSeedProfilesToRemove" ("dogId", "ownerId", email) VALUES
  ('cmvsdwe3p0004lggbgqhmyd4e', 'cmvsdwcol0000lggbhugwf2xk', 'mariana.almeida@example.com'),
  ('cmvsdwfxr0009lggbmec197c7', 'cmvsdwet20005lggbqqhydhg8', 'lucas.ribeiro@example.com'),
  ('cmvsdwib9000elggbdozthlvv', 'cmvsdwh4x000alggbfmdjvg0f', 'camila.ferreira@example.com'),
  ('cmvsdwk8h000jlggbfm5gs1xz', 'cmvsdwix1000flggbmpy3c90z', 'rafael.costa@example.com'),
  ('cmvsdwmb8000olggbdb0m3vzl', 'cmvsdwl5u000klggbfn7pd8wr', 'juliana.martins@example.com'),
  ('cmvsdwo1y000tlggb3oywqtkp', 'cmvsdwmz6000plggbkt6ansq3', 'bruno.oliveira@example.com'),
  ('cmvsdwpyw000ylggbt4twij42', 'cmvsdwp0y000ulggbsuon4028', 'fernanda.souza@example.com'),
  ('cmvsdwrt90013lggb4xf7rc2n', 'cmvsdwqpm000zlggbkbwa3drq', 'thiago.pereira@example.com'),
  ('cmvsdwu9p0018lggb19fgmgvn', 'cmvsdwt730014lggbouq5hypx', 'beatriz.lima@example.com'),
  ('cmvsdww7b001dlggb2turfr0t', 'cmvsdwux60019lggblxfhbuox', 'gustavo.rocha@example.com'),
  ('cmvsdwy8y001ilggb9ziljcua', 'cmvsdwx0w001elggbktx351vh', 'amanda.carvalho@example.com'),
  ('cmvsdx01j001nlggbmxu59z0o', 'cmvsdwyz7001jlggb29w4vzvy', 'felipe.santos@example.com'),
  ('cmvsdx2bf001slggbjwp9e9ly', 'cmvsdx13w001olggb72tj6x8z', 'larissa.gomes@example.com'),
  ('cmvsdx42z001xlggbg25mvzy2', 'cmvsdx2zb001tlggb7la8vyvo', 'henrique.barbosa@example.com'),
  ('cmvsdx5yk0022lggbpn3qzirq', 'cmvsdx4ws001ylggba8lh8ytr', 'patricia.azevedo@example.com'),
  ('cmvsdx7oe0027lggblenuvq0o', 'cmvsdx6mq0023lggben551bc4', 'diego.moreira@example.com'),
  ('cmvsdxalk002clggb6fn5fosk', 'cmvsdx9160028lggb5hxqyqkt', 'isabela.cardoso@example.com'),
  ('cmvsdxd97002hlggbp38eplr7', 'cmvsdxba9002dlggbiqsrpigv', 'rodrigo.teixeira@example.com'),
  ('cmvsdxflf002mlggbruh789xk', 'cmvsdxe3g002ilggbc9wf7017', 'carolina.nunes@example.com'),
  ('cmvsdxhiu002rlggbgxlevbsi', 'cmvsdxgc3002nlggbzz0x7aqe', 'andre.monteiro@example.com'),
  ('cmvsdxjid002wlggbq0mawe2t', 'cmvsdxi54002slggbluw7vuay', 'leticia.castro@example.com'),
  ('cmvsdxl7g0031lggbqg70k5uv', 'cmvsdxk3l002xlggb7exj5dgy', 'vinicius.melo@example.com'),
  ('cmvsdxnar0036lggbao9788ni', 'cmvsdxm170032lggb59mna4zo', 'gabriela.duarte@example.com'),
  ('cmvsdxpm6003blggblecqyz3l', 'cmvsdxobe0037lggbngdx3vqs', 'eduardo.fernandes@example.com'),
  ('cmvsdxs5d003glggbq6k4aacm', 'cmvsdxqck003clggb5mlxofh6', 'natalia.lopes@example.com'),
  ('cmvsdxunk003llggbvmni3e15', 'cmvsdxszm003hlggb59h7b0yq', 'leonardo.campos@example.com'),
  ('cmvsdxx57003qlggbklz36441', 'cmvsdxvbf003mlggb09r6grue', 'priscila.mendes@example.com'),
  ('cmvsdxzdx003vlggbyperi0t6', 'cmvsdxy12003rlggb8gkcbq4h', 'caio.batista@example.com'),
  ('cmvsdy1en0040lggbwfcia5i6', 'cmvsdy03u003wlggb6zcde9o6', 'renata.correia@example.com'),
  ('cmvsdy3cn0045lggbh06x6n98', 'cmvsdy22d0041lggbqot6djdu', 'marcelo.vieira@example.com'),
  ('cmvsdy53r004alggble6vh7qc', 'cmvsdy3zp0046lggbkweym290', 'aline.ramos@example.com'),
  ('cmvsdy6zs004flggb5w0qad94', 'cmvsdy5q1004blggbksn4n6v0', 'daniel.freitas@example.com'),
  ('cmvsdy995004klggb7jqe16ug', 'cmvsdy7rk004glggbjs46f3yg', 'vanessa.andrade@example.com'),
  ('cmvsdybed004plggbnk5brn5t', 'cmvsdya0x004llggbkpetisi8', 'pedro.cunha@example.com'),
  ('cmvsdydn7004ulggblv2g205x', 'cmvsdyc89004qlggbx76pt6z4', 'bianca.rezende@example.com'),
  ('cmvsdyfti004zlggb6c0ykb39', 'cmvsdyec1004vlggbixj46jov', 'ricardo.farias@example.com'),
  ('cmvsdyhpr0054lggb5po9eb1j', 'cmvsdyghe0050lggbnb089s98', 'debora.guimaraes@example.com'),
  ('cmvsdyjiu0059lggb8whpkki5', 'cmvsdyib90055lggbnmmwaw8i', 'matheus.borges@example.com'),
  ('cmvsdylrs005elggbosx8a03r', 'cmvsdykbi005alggbxo47gqhz', 'luana.tavares@example.com'),
  ('cmvsdynhl005jlggb45tda7aj', 'cmvsdymd3005flggbdvalh2w3', 'alexandre.dias@example.com'),
  ('cmvsdypbq005olggb2z1ey0je', 'cmvsdyo45005klggby8e9nov7', 'sabrina.pires@example.com'),
  ('cmvsdyrb4005tlggb29naryty', 'cmvsdypxb005plggbd8plsubp', 'igor.macedo@example.com'),
  ('cmvsdyt6c005ylggbsg91ojxb', 'cmvsdyrz8005ulggb98armmjz', 'thais.peixoto@example.com'),
  ('cmvsdyv8b0063lggbq65wx6hv', 'cmvsdytzk005zlggblmx93x7x', 'renan.silveira@example.com'),
  ('cmvsdywxc0068lggbnha6iis7', 'cmvsdyvud0064lggbnwwfsdcs', 'jessica.coelho@example.com'),
  ('cmvsdzhs1006flggb9lgydyo3', 'cmvsdyxji0069lggb1q1h2lc9', 'fabio.amaral@example.com'),
  ('cmvsdzjnq006klggbkyl6h978', 'cmvsdziku006glggbs8gv4ug5', 'vitoria.assis@example.com'),
  ('cmvsdzllf006plggbcdq8ocoe', 'cmvsdzk99006llggb12vdh3ju', 'samuel.braga@example.com'),
  ('cmvsdzngp006ulggbln2g315r', 'cmvsdzm6q006qlggbcllnf1pv', 'clara.miranda@example.com'),
  ('cmvsdzpf2006zlggb6otq49zd', 'cmvsdzo3d006vlggbtqlfxor1', 'otavio.barros@example.com');

-- Queue covers and gallery images before cascading the fixture records.
-- The normal cleanup service preserves photos still referenced by real dogs.
INSERT INTO "PhotoDeletion" (id, url)
SELECT DISTINCT 'fixture-cleanup-' || md5(photo.url), photo.url
FROM "Dog" d
JOIN "PetNamoraSeedProfilesToRemove" s ON s."dogId" = d.id AND s."ownerId" = d."ownerId"
JOIN "User" u ON u.id = s."ownerId" AND u.email = s.email
CROSS JOIN LATERAL unnest(ARRAY[d."photoUrl"] || d."photoUrls") AS photo(url)
WHERE u."isAdmin" = false AND photo.url <> ''
ON CONFLICT (url) DO NOTHING;

-- Existing foreign keys remove only interactions involving the fixture dogs.
DELETE FROM "Dog" d
USING "PetNamoraSeedProfilesToRemove" s, "User" u
WHERE d.id = s."dogId" AND d."ownerId" = s."ownerId"
  AND u.id = s."ownerId" AND u.email = s.email AND u."isAdmin" = false;

-- Keep any account that now owns a real dog or has administrative history.
DELETE FROM "User" u
USING "PetNamoraSeedProfilesToRemove" s
WHERE u.id = s."ownerId" AND u.email = s.email AND u."isAdmin" = false
  AND NOT EXISTS (SELECT 1 FROM "Dog" d WHERE d."ownerId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "AdminAction" a WHERE a."actorId" = u.id);

COMMIT;
