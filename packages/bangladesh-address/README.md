# @nishchinte/bangladesh-address

Fast, typed, and complete administrative dataset and query engine for Bangladesh (Divisions, Districts, Upazilas, and Thanas) with $O(1)$ lookups and reverse resolution.

## Features

- 🗺️ **Comprehensive Dataset**: Complete geographic mapping of all 8 Divisions, 64 Districts, 495 Upazilas, and metropolitan Thanas.
- ⚡ **High Performance ($O(1)$)**: Pre-indexed `Set` and `Map` collections for instantaneous validation, lookups, and reverse resolution.
- 🔍 **Full-Text Location Search**: Unified `searchLocations("dha")` querying across divisions, districts, upazilas, and thanas.
- 🔄 **Reverse Lookups**: Resolve district from an upazila or division from a district.
- 🛡️ **Strict TypeScript Typing**: Strongly typed `DivisionName` enum, `Upazila`, and `Thana` interfaces.

## Installation

```bash
# In workspace
pnpm add @nishchinte/bangladesh-address
```

## Quick Start

### 1. Divisions

```typescript
import {
  allDivision,
  isValidDivision,
  divisionalDataOf,
  DivisionName,
} from "@nishchinte/bangladesh-address";

// List all 8 divisions
const divisions = allDivision(); // ["Dhaka", "Chattogram", "Rajshahi", ...]

// Validate division
isValidDivision("Dhaka"); // true
isValidDivision("London"); // false

// Get all districts and upazilas of a division
const dhakaData = divisionalDataOf(DivisionName.Dhaka);
```

### 2. Districts

```typescript
import {
  allDistricts,
  districtsOf,
  isValidDistrict,
  getDivisionOfDistrict,
  DivisionName,
} from "@nishchinte/bangladesh-address";

// Get all 64 districts
const districts = allDistricts();

// Get districts in a specific division
const ctgDistricts = districtsOf(DivisionName.Chattogram);

// Reverse lookup: District -> Division
getDivisionOfDistrict("Gazipur"); // "Dhaka"
getDivisionOfDistrict("Cox's Bazar"); // "Chattogram"
```

### 3. Upazilas & Thanas

```typescript
import {
  allUpazila,
  upazilasOf,
  getUpazilas,
  allThana,
  thanasOf,
  isUpazila,
  isThana,
  getDistrictOfUpazila,
} from "@nishchinte/bangladesh-address";

// Get all upazilas in a district
const mirpurUpazilas = upazilasOf("Dhaka");
const upazilaNames = getUpazilas("Sylhet");

// Metropolitan police stations (Thanas)
const dhakaThanas = thanasOf("Dhaka"); // [{ thana: "Dhanmondi", district: "Dhaka", ... }]

// Reverse lookup: Upazila -> District
getDistrictOfUpazila("Sreemangal"); // "Moulvibazar"
getDistrictOfUpazila("Gulshan"); // "Dhaka"
```

### 4. Unified Search

```typescript
import { searchLocations } from "@nishchinte/bangladesh-address";

// Search across divisions, districts, upazilas, and thanas
const results = searchLocations("uttara");
// [
//   { name: "Uttara", type: "thana", district: "Dhaka", division: "Dhaka" },
//   { name: "Uttara Paschim", type: "thana", district: "Dhaka", division: "Dhaka" }
// ]
```

## Exports

- **Divisions**: `allDivision`, `isValidDivision`, `divisionalDataOf`, `getDivision`, `DivisionName`.
- **Districts**: `allDistricts`, `districtsOf`, `isValidDistrict`, `getDivisionOfDistrict`.
- **Upazilas**: `allUpazila`, `upazilasOf`, `getUpazilas`, `upazilaNamesOf`, `isUpazila`, `getUpazila`, `getDistrictOfUpazila`, `upazilasOfDivision`.
- **Thanas**: `allThana`, `allThanaNames`, `thanasOf`, `thanaNamesOf`, `isThana`, `getThana`.
- **Search**: `searchLocations`, `SearchResult`.
