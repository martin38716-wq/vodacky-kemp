function proposeBoats(state) {
  let adultsTotal = state.adults || 0;
  const childrenTotal = state.children || 0;
  const type = state.boats?.type || "canoe";

  if (adultsTotal === 0) {
    state.boats.proposal = [];
    return;
  }

  let adults = adultsTotal;
  let children = childrenTotal;

  state.boats.proposal = [];


  /* ======================
     KANOE – KOMFORTNÍ LOGIKA
  ====================== */
  if (type === "canoe") {

    // 1️⃣ Nejdřív vytvoříme kanoe pro dospělé
    const adultBoats = [];

    while (adults > 0) {
      if (adults >= 2) {
        adultBoats.push({ adults: 2, children: 0 });
        adults -= 2;
      } else {
        adultBoats.push({ adults: 1, children: 0 });
        adults -= 1;
      }
    }

    // 2️⃣ Rozdělení dětí k existujícím kanoím (max 3 děti / kanoe)
    adultBoats.forEach(boat => {
      if (children > 0) {
        const freeSeats = 4 - boat.adults;
        const add = Math.min(children, freeSeats);
        boat.children += add;
        children -= add;
      }
    });

        // 3️⃣ Pokud zbyly děti (teoreticky), vytvoříme kanoe s 1 dospělým + děti
    while (children > 0 && adultsTotal > 0) {
      state.boats.proposal.push({
        type: "canoe",
        assigned: {
          adults: 1,
          children: Math.min(children, 3)
        }
      });
      const usedChildren = Math.min(children, 3);
      children -= usedChildren;
      adultsTotal -= 1;
    }


    // 4️⃣ Přepis do výsledku
    adultBoats.forEach(b => {
      state.boats.proposal.push({
        type: "canoe",
        assigned: {
          adults: b.adults,
          children: b.children
        }
      });
    });

    return;
  }

  /* ======================
     RAFT – SKUPINOVÁ LOGIKA
  ====================== */
  if (type === "raft") {

    let total = adults + children;

    // bez dospělého nelze
    if (adults === 0) return;

    // do 6 osob → 1 raft (klidně jen 1 dospělý)
    if (total <= 6) {
      state.boats.proposal.push({
        type: "raft",
        assigned: {
          adults: Math.min(adults, total),
          children: total - Math.min(adults, total)
        }
      });
      return;
    }

        // 7–8 osob → 2 rafty rovnoměrně
    if (total <= 8) {
      const first = Math.ceil(total / 2);

      state.boats.proposal.push({
        type: "raft",
        assigned: {
          adults: Math.min(adults, first),
          children: Math.max(0, first - adults)
        }
      });

      const remainingAdults = adults - Math.min(adults, first);

      state.boats.proposal.push({
        type: "raft",
        assigned: {
          adults: remainingAdults,
          children: total - first - remainingAdults
        }
      });

      state.boats.proposal.forEach(r => {
        if (r.assigned.adults === 0 && adults > 0 && r.assigned.children > 0) {
          r.assigned.adults = 1;
          r.assigned.children -= 1;
          adults -= 1;
        }
      });

      return;
    }

    // 9+ osob → cyklus po max 6 lidech
    while (total > 0) {
      const size = Math.min(6, total);
      const usedAdults = Math.max(1, Math.min(adults, size));


      state.boats.proposal.push({
        type: "raft",
        assigned: {
          adults: usedAdults,
          children: size - usedAdults
        }
      });

      adults -= usedAdults;
      total -= size;
      adults = Math.max(0, adults);
    }
  }
}
