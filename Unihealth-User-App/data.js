const PHARMACY_DATA = [
  // --- PAIN & FEVER ---
  { id: '1', name: 'Dolo 650', generic: 'Paracetamol', price: 30, category: 'Fever', strip: '15 Tablets' },
  { id: '2', name: 'Saridon', generic: 'Propyphenazone', price: 42, category: 'Headache', strip: '10 Tablets' },
  { id: '3', name: 'Combiflam', generic: 'Ibuprofen + Paracetamol', price: 45, category: 'Pain Relief', strip: '20 Tablets' },
  { id: '4', name: 'Voveran SR 100', generic: 'Diclofenac', price: 150, category: 'Pain Relief', strip: '10 Tablets' },
  { id: '5', name: 'Ultracet', generic: 'Tramadol + Paracetamol', price: 210, category: 'Severe Pain', strip: '15 Tablets' },

  // --- COLD & COUGH ---
  { id: '6', name: 'Ascoril LS Syrup', generic: 'Ambroxol + Levosalbutamol', price: 115, category: 'Cough', strip: '100ml' },
  { id: '7', name: 'Benadryl DR', generic: 'Dextromethorphan', price: 130, category: 'Dry Cough', strip: '100ml' },
  { id: '8', name: 'Allegra 120mg', generic: 'Fexofenadine', price: 215, category: 'Allergy', strip: '10 Tablets' },
  { id: '9', name: 'Cetirizine', generic: 'Okacet', price: 18, category: 'Allergy', strip: '10 Tablets' },
  { id: '10', name: 'Otrivin Nasal Spray', generic: 'Xylometazoline', price: 98, category: 'Cold', strip: '10ml' },

  // --- DIGESTION & ANTACIDS ---
  { id: '11', name: 'Digene Gel', generic: 'Antacid', price: 145, category: 'Acidity', strip: '200ml' },
  { id: '12', name: 'Pantocid 40', generic: 'Pantoprazole', price: 165, category: 'Acidity', strip: '15 Tablets' },
  { id: '13', name: 'Eno (Sachet)', generic: 'Fruit Salt', price: 9, category: 'Gas', strip: '1 Unit' },
  { id: '14', name: 'Zinetac 150', generic: 'Ranitidine', price: 25, category: 'Acidity', strip: '30 Tablets' },
  { id: '15', name: 'Gelusil MPS', generic: 'Antacid', price: 60, category: 'Acidity', strip: '10 Tablets' },

  // --- DIABETES (Cold Chain Items) ---
  { id: '16', name: 'Mixtard 30/70', generic: 'Insulin', price: 550, category: 'Diabetes', strip: '10ml Vial', coldChain: true },
  { id: '17', name: 'Lantus Solostar', generic: 'Insulin Glargine', price: 720, category: 'Diabetes', strip: '1 Pen', coldChain: true },
  { id: '18', name: 'Glycomet GP 1', generic: 'Metformin + Glimepiride', price: 110, category: 'Diabetes', strip: '15 Tablets' },
  { id: '19', name: 'Galvus Met 50/500', generic: 'Vildagliptin + Metformin', price: 340, category: 'Diabetes', strip: '15 Tablets' },
  { id: '20', name: 'Jardiance 10mg', generic: 'Empagliflozin', price: 850, category: 'Diabetes', strip: '10 Tablets' },

  // --- HEART & CHOLESTEROL ---
  { id: '21', name: 'Ecosprin 75', generic: 'Aspirin', price: 5, category: 'Heart', strip: '14 Tablets' },
  { id: '22', name: 'Lipivas 10', generic: 'Atorvastatin', price: 85, category: 'Cholesterol', strip: '15 Tablets' },
  { id: '23', name: 'Telma 40', generic: 'Telmisartan', price: 195, category: 'BP', strip: '15 Tablets' },
  { id: '24', name: 'Amlokind 5', generic: 'Amlodipine', price: 22, category: 'BP', strip: '15 Tablets' },
  { id: '25', name: 'Rosuvas 10', generic: 'Rosuvastatin', price: 240, category: 'Cholesterol', strip: '15 Tablets' },

  // --- ANTIBIOTICS ---
  { id: '26', name: 'Augmentin 625 Duo', generic: 'Amoxycillin + Clavulanic Acid', price: 201, category: 'Antibiotic', strip: '10 Tablets' },
  { id: '27', name: 'Azithral 500', generic: 'Azithromycin', price: 120, category: 'Antibiotic', strip: '5 Tablets' },
  { id: '28', name: 'Taxim O 200', generic: 'Cefixime', price: 105, category: 'Antibiotic', strip: '10 Tablets' },
  { id: '29', name: 'Ciplox 500', generic: 'Ciprofloxacin', price: 45, category: 'Antibiotic', strip: '10 Tablets' },
  { id: '30', name: 'Monocef 1g Injection', generic: 'Ceftriaxone', price: 65, category: 'Antibiotic', strip: '1 Vial' },

  // --- VITAMINS & SUPPLEMENTS ---
  { id: '31', name: 'Revital H', generic: 'Multivitamin', price: 310, category: 'Supplements', strip: '30 Capsules' },
  { id: '32', name: 'Becosules Z', generic: 'B-Complex + Zinc', price: 50, category: 'Supplements', strip: '20 Capsules' },
  { id: '33', name: 'Evion 400', generic: 'Vitamin E', price: 35, category: 'Skin/Hair', strip: '10 Capsules' },
  { id: '34', name: 'Shelcal 500', generic: 'Calcium + Vit D3', price: 125, category: 'Bones', strip: '15 Tablets' },
  { id: '35', name: 'Neurobion Forte', generic: 'Vitamin B12', price: 38, category: 'Nerves', strip: '30 Tablets' },

  // --- SKIN & TOPICAL ---
  { id: '36', name: 'Betadine Ointment', generic: 'Povidone-Iodine', price: 115, category: 'First Aid', strip: '20g Tube' },
  { id: '37', name: 'Volini Gel', generic: 'Pain Relief Gel', price: 145, category: 'Pain Relief', strip: '30g' },
  { id: '38', name: 'Itaspor 100', generic: 'Itraconazole', price: 185, category: 'Antifungal', strip: '10 Capsules' },
  { id: '39', name: 'Fourderm Cream', generic: 'Antibacterial + Antifungal', price: 95, category: 'Skin', strip: '10g' },
  { id: '40', name: 'Candid Powder', generic: 'Clotrimazole', price: 110, category: 'Antifungal', strip: '100g' },

  // --- MISCELLANEOUS ---
  { id: '41', name: 'ORS (Electral)', generic: 'Oral Rehydration', price: 21, category: 'Energy', strip: '1 Sachet' },
  { id: '42', name: 'Crocin Pain Relief', generic: 'Caffeine + Paracetamol', price: 65, category: 'Headache', strip: '15 Tablets' },
  { id: '43', name: 'Liv 52 DS', generic: 'Ayurvedic Liver Care', price: 175, category: 'Liver', strip: '60 Tablets' },
  { id: '44', name: 'Meftal Spas', generic: 'Mefenamic Acid + Dicyclomine', price: 55, category: 'Cramps', strip: '10 Tablets' },
  { id: '45', name: 'Deriphyllin Retard 150', generic: 'Theophylline + Etofylline', price: 35, category: 'Asthma', strip: '30 Tablets' },
  { id: '46', name: 'Eptoin 100', generic: 'Phenytoin Sodium', price: 185, category: 'Epilepsy', strip: '100 Tablets' },
  { id: '47', name: 'Wysolone 10', generic: 'Prednisolone', price: 15, category: 'Steroid', strip: '15 Tablets' },
  { id: '48', name: 'Zifi 200', generic: 'Cefixime', price: 115, category: 'Antibiotic', strip: '10 Tablets' },
  { id: '49', name: 'Avil 25', generic: 'Pheniramine Maleate', price: 10, category: 'Allergy', strip: '15 Tablets' },
  { id: '50', name: 'Limcee 500', generic: 'Vitamin C', price: 25, category: 'Immunity', strip: '15 Tablets' },
];