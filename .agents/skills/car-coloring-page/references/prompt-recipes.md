# 자동차 색칠 도안 프롬프트 레시피 (Prompt Recipes)

본 문서는 `Car Coloring Studio`의 16:9 라인아트 도안 디자인 시스템에 완벽하게 일치하는 이미지를 `generate_image` 도구로 생성하기 위한 프롬프트 가이드입니다.

---

## 🎨 핵심 아트 스타일 규칙 (Design System)

1. **외곽선 (Line Art)**
   - 굵고 선명한 검은색 외곽선 (`crisp bold black outlines`, `clean vector-style line art`)
   - 플러드 필(페인트통) 채색을 위한 **완전 폐쇄형 루프(Closed contours)** 유지
   - 스케치 선, 털선, 끊긴 선 배제 (`no sketchy lines`, `no rough pencil texture`)

2. **내부 및 배경 (Fills & Background)**
   - 차량 내부 패널 및 유리창, 휠 모두 **순백색 무채색(Pure white fill)** 유지
   - 음영, 그라데이션, 하프톤, 망점, 빗금(Cross-hatching) 금지 (`no shading`, `no grayscale gradients`, `no cross-hatching`, `no halftone dots`)
   - 배경은 차량 밑 미니멀한 단일 바닥선(Road baseline)을 제외하고 **순수 흰색 배경(Pure solid white background)**

3. **구도 및 비율 (Framing & Aspect Ratio)**
   - 비율: `AspectRatio: '16:9'` (필수)
   - 앵글: 차량의 캐릭터 라인과 그릴, 휠, 램프가 돋보이는 **역동적인 3/4 전측면 뷰 (Dynamic 3/4 front quarter view)** 또는 특수 건설장비의 **측면 프로필 뷰 (Side profile view)**
   - 패딩: 캔버스 가장자리와 차량 사이에 10~15%의 여백을 두고 중앙 정렬

---

## 📝 표준 마스터 프롬프트 구조

```text
A high quality coloring book page for kids and adults, clean black and white line art of a [차량 모델명 (영어)], [핵심 디자인 특징 3~4가지]. Dynamic 3/4 front angle view, centered composition with balanced margins. Crisp solid black outlines, clear closed contours suitable for paint bucket fill, pure white interior panels, no colors, no grayscale shading, no gradients, no textures, minimal clean ground line beneath the tires, pure solid white background, 8k resolution vector style coloring sheet.
```

---

## 🚗 차종별 특화 프롬프트 템플릿

### 1. 승용차 / 세단 (Sedan)

#### 🔹 현대 아반떼 CN7 (Avante / Elantra CN7)
```text
A coloring book page for kids and adults, clean black and white line art of a modern Hyundai Elantra Avante CN7 compact sedan. Parametric jewel pattern front grille, sharp geometric triangular character lines along the side body, sleek LED headlights, modern alloy wheels. Dynamic 3/4 front angle view, crisp bold black outlines, closed contours for coloring, pure white interior and panels, no shading, no grayscale gradients, clean road baseline, pure white background.
```

#### 🔹 현대 그랜저 GN7 (Grandeur GN7)
```text
A coloring book page for kids and adults, clean black and white line art of a luxury Hyundai Grandeur GN7 flagship sedan. Seamless horizon LED light bar across the front hood, parametric jewel grille, flush door handles, elegant fastback roofline, luxury multi-spoke alloy wheels. Dynamic 3/4 front view, bold continuous black line art, pure white fills, no shading, no textures, clean road line, pure white background.
```

#### 🔹 제네시스 G80 (Genesis G80)
```text
A coloring book page for kids and adults, clean black and white line art of a luxury Genesis G80 premium sedan. Iconic crest grille with G-Matrix pattern, signature quad lamps (two-line headlights and side turn signals), parabolic side character line, athletic luxury wheels. Dynamic 3/4 front angle view, crisp black outlines, closed contours, pure white panels, no shading, no gradients, pure white background.
```

#### 🔹 테슬라 모델 3 (Tesla Model 3)
```text
A coloring book page for kids and adults, clean black and white line art of a Tesla Model 3 electric sedan. Grille-less aerodynamic minimalist front bumper, sleek teardrop cabin with panoramic glass roof lines, flush door handles, aero sport wheels. Dynamic 3/4 front view, clean crisp black line drawing, pure white fills, no shading, minimal ground line, pure white background.
```

#### 🔹 BMW 5시리즈 (BMW 5 Series)
```text
A coloring book page for kids and adults, clean black and white line art of a modern BMW 5 Series executive sedan. Iconic illuminated kidney grille, twin LED adaptive headlights, Hofmeister kink window curve, sporty M-aerodynamic front bumper and alloy wheels. Dynamic 3/4 front quarter view, bold black vector line art, pure white coloring sheet, no shading, pure white background.
```

---

### 2. SUV / CUV / MPV

#### 🔹 제네시스 GV80 (Genesis GV80)
```text
A coloring book page for kids and adults, clean black and white line art of a Genesis GV80 luxury SUV. Crest grille, dual two-line LED headlamps, muscular wheel arches, large twin-spoke sport wheels, elegant SUV roof rack. Dynamic 3/4 front angle view, crisp clean black outlines, closed coloring regions, pure white interior, no grayscale gradients, minimal road line, pure white background.
```

#### 🔹 현대 싼타페 MX5 (Hyundai Santa Fe MX5)
```text
A coloring book page for kids and adults, clean black and white line art of a boxy Hyundai Santa Fe MX5 SUV. Signature H-shaped LED daytime running lights, rugged boxy outdoor silhouette, robust wheel fenders, bold roof rails, all-terrain geometric alloy wheels. Dynamic 3/4 front view, bold black lines, pure white fills, no shading, pure white background.
```

#### 🔹 기아 카니발 (Kia Carnival / Sedona)
```text
A coloring book page for kids and adults, clean black and white line art of a modern Kia Carnival MPV minivan. Star-map signature LED daytime running lights, grand chrome front grille, sliding rear doors outline, spacious family wagon silhouette, premium alloy wheels. Dynamic 3/4 front angle view, clean black coloring line art, pure white fills, no shading, pure white background.
```

#### 🔹 메르세데스-벤츠 G클래스 (Mercedes-Benz G-Wagon)
```text
A coloring book page for kids and adults, clean black and white line art of a Mercedes-Benz G-Class G-Wagon luxury 4x4 off-road SUV. Iconic boxy body structure, round LED headlights, Panamericana vertical grille, prominent external door hinges, rugged spare tire cover on rear, chunky all-terrain tires. Dynamic 3/4 front angle view, bold black outlines, pure white interior, no shading, pure white background.
```

#### 🔹 레인지로버 (Range Rover)
```text
A coloring book page for kids and adults, clean black and white line art of a flagship Range Rover luxury SUV. Seamless minimalist floating roof design, flush door handles, clean horizontal front grille with slim LED lamps, massive 22-inch turbine wheels. Dynamic 3/4 front angle view, crisp black line art, pure white fill, no shading, pure white background.
```

---

### 3. 스포츠카 / 슈퍼카 (Sports / Performance)

#### 🔹 부가티 시론 (Bugatti Chiron)
```text
A coloring book page for kids and adults, clean black and white line art of a Bugatti Chiron hypercar. Iconic horseshoe front grille, quad LED projector headlights, dramatic signature C-shaped side aero curve, massive active rear wing, wide low-slung body. Dynamic 3/4 front angle view, crisp sharp black outlines, closed contours for coloring, pure white panels, no shading, pure white background.
```

#### 🔹 페라리 SF90 스트라달레 (Ferrari SF90 Stradale)
```text
A coloring book page for kids and adults, clean black and white line art of a Ferrari SF90 Stradale supercar. Aggressive front aero splitter, C-shaped matrix LED headlights, side air intake scoops, rear diffuser lines, ultra-low racing stance. Dynamic 3/4 front view, bold continuous black outlines, pure white coloring page, no shading, pure white background.
```

---

### 4. 화물차 / 상용차 (Truck & Logistics)

#### 🔹 현대 포터 II / EV 전기 트럭
```text
A coloring book page for kids and adults, clean black and white line art of a Hyundai Porter II 1-ton Korean light cargo pickup truck. Compact cab-over front cabin with clear windshield and wipers, sturdy side mirrors, open cargo flatbed with drop-sides, dual rear wheels. Dynamic 3/4 front angle view, bold clean black lines, closed regions, pure white fills, no shading, pure white background.
```

---

### 5. 승합차 / 대중교통 (Bus)

#### 🔹 현대 일렉시티 전기 시내버스 (Hyundai Elec City Electric Bus)
```text
A coloring book page for kids and adults, clean black and white line art of a modern electric low-floor city transit bus. Large panoramic front windshield, destination LED display box, roof-mounted battery pack fairing, twin passenger entry doors, large side windows. Dynamic 3/4 front perspective view, crisp black outline art, pure white fills, no shading, pure white background.
```

---

### 6. 특수목적차 / 중장비 (Special Purpose & Construction)

#### 🔹 굴착기 / 포크레인 (Excavator)
```text
A coloring book page for kids and adults, clean black and white line art of a heavy hydraulic construction excavator. Articulated boom arm with hydraulic cylinders, heavy duty digging bucket with sharp teeth, operator cabin with safety cage, heavy crawler tracks on rocky terrain ground line. Dynamic side 3/4 angle view, bold clean black line drawing, pure white coloring sheet, no shading, pure white background.
```

#### 🔹 소방 사다리차 (Fire Ladder Engine)
```text
A coloring book page for kids and adults, clean black and white line art of a modern heavy rescue fire truck with aerial turntable ladder. Emergency light bars on roof, high-reach telescoping ladder assembly, side equipment compartments with roll-up shutters, high-pressure water cannon nozzles. Dynamic 3/4 front view, crisp bold black outlines, pure white coloring page, no shading, pure white background.
```

---

## 🚫 금지 사항 (Negative Style Control)

도안 생성 시 다음 요소가 포함되지 않도록 주의합니다:
- ❌ **그레이스케일 음영 및 하프톤(망점)**: 페인트통 도구가 경계선을 인식하는 데 방해됩니다.
- ❌ **불완전한 열린 선 (Open lines)**: 색칠 시 캔버스 전체로 색상이 유출됩니다.
- ❌ **복잡한 배경 요소 (빌딩, 산, 복잡한 나무 등)**: 자동차 자체에 집중할 수 있도록 단일 바닥선만 허용합니다.
- ❌ **텍스트 및 워터마크**: 차량 엠블럼 외의 불필요한 타이포그래피나 로고 텍스트는 배제합니다.
