<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SaveController
{
    public function show(Request $request)
    {
        return response()->json([
            'account_id' => $request->user()->id,
            'save' => $this->slot($request->user()->id),
        ]);
    }

    private function slot(int $id): ?array
    {
        $row = DB::table('cloud_saves')->where('user_id', $id)->first();
        return $row ? ['revision' => (int) $row->revision, 'state' => json_decode($row->state, true)] : null;
    }

    public function store(Request $request)
    {
        $state = $this->validate($request->all());
        return DB::transaction(function () use ($request, $state) {
            // Lock an existing owner row, even before a slot exists. This serializes creation too.
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->firstOrFail();
            $slot = $this->slot($request->user()->id);
            $revision = $slot['revision'] ?? 0;
            if ($request->input('revision') !== $revision) {
                return response()->json(['error' => 'revision_conflict'], 409);
            }
            if ($request->input('state.version') === 1 && ($slot['state']['version'] ?? 1) >= 2) {
                return response()->json(['error' => 'client_upgrade_required'], 409);
            }
            DB::table('cloud_saves')->updateOrInsert(['user_id' => $request->user()->id], [
                'revision' => $revision + 1,
                'state' => json_encode($state, JSON_THROW_ON_ERROR),
                'score' => $state['earned'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return response()->json([
                'account_id' => $request->user()->id,
                'save' => ['revision' => $revision + 1, 'state' => $state],
            ]);
        }, 3);
    }

    private function validate(array $input): array
    {
        $legacy = is_array($input['state'] ?? null) && ($input['state']['version'] ?? null) === 1;
        // Laravel's integer/boolean rules accept strings: require exact JSON scalar types too.
        $integer = function ($attribute, $value, $fail) {
            if (!is_int($value)) $fail('Must be a JSON integer.');
        };
        $boolean = function ($attribute, $value, $fail) {
            if (!is_bool($value)) $fail('Must be a JSON boolean.');
        };
        $number = function ($attribute, $value, $fail) {
            if (!(is_int($value) || is_float($value)) || !is_finite((float) $value)) {
                $fail('Must be a finite JSON number.');
            }
        };
        $rules = [
            'revision' => ['required', $integer, 'integer', 'min:0', 'max:2147483646'],
            'state' => ['required', 'array:version,farmerName,day,minutes,money,energy,seeds,produce,selectedSeed,planted,harvested,earned,questReward,player,tiles,upgrades,horse,orders,reservations,processor,dailyActions,lastNightDay'],
            'state.version' => ['required', $integer, 'integer', 'in:2'],
            'state.farmerName' => ['present', 'string', 'max:24'],
            'state.day' => ['required', $integer, 'integer', 'min:1', 'max:1000000'],
            'state.minutes' => ['required', $integer, 'integer', 'between:360,1190'],
            'state.energy' => ['required', $integer, 'integer', 'between:0,100'],
            'state.selectedSeed' => ['required', 'in:parsnip,carrot,strawberry'],
            'state.questReward' => ['required', $boolean],
            'state.player' => ['required', 'array:x,y'],
            'state.player.x' => ['required', $number, 'numeric', 'between:0,960'],
            'state.player.y' => ['required', $number, 'numeric', 'between:0,600'],
            'state.tiles' => ['required', 'array', 'list', 'size:28'],
            'state.tiles.*' => ['required', 'array:tilled,crop,age,watered'],
            'state.tiles.*.tilled' => ['required', $boolean],
            'state.tiles.*.watered' => ['required', $boolean],
            'state.tiles.*.crop' => ['present', 'nullable', 'in:parsnip,carrot,strawberry'],
            'state.tiles.*.age' => ['required', $integer, 'integer', 'between:0,4'],
            'state.upgrades' => ['required', 'array:wateringCan,sprinkler,plow,stable,jamMaker'],
            'state.upgrades.wateringCan' => ['required', $integer, 'integer', 'between:0,1'],
            'state.upgrades.sprinkler' => ['required', $boolean],
            'state.upgrades.plow' => ['required', $boolean],
            'state.upgrades.stable' => ['required', $boolean],
            'state.upgrades.jamMaker' => ['required', $boolean],
            'state.horse' => ['required', 'array:owned,name,mounted,feedDay,feedBonus,x,y'],
            'state.horse.owned' => ['required', $boolean],
            'state.horse.name' => ['present', 'string', 'max:20'],
            'state.horse.mounted' => ['required', $boolean],
            'state.horse.feedDay' => ['required', $integer, 'integer', 'between:0,1000000'],
            'state.horse.x' => ['required', $number, 'numeric', 'between:70,895'],
            'state.horse.y' => ['required', $number, 'numeric', 'between:82,560'],
            'state.horse.feedBonus' => ['required', $boolean],
            'state.orders' => ['present', 'array', 'list', 'max:3'],
            'state.orders.*' => ['required', 'array:id,crop,required,reward,delivered,completed'],
            'state.orders.*.id' => ['required', 'string', 'max:32'],
            'state.orders.*.crop' => ['required', 'in:parsnip,carrot,strawberry'],
            'state.orders.*.required' => ['required', $integer, 'integer', 'between:1,99'],
            'state.orders.*.reward' => ['required', $integer, 'integer', 'between:1,100000'],
            'state.orders.*.delivered' => ['required', $integer, 'integer', 'between:0,99'],
            'state.orders.*.completed' => ['required', $boolean],
            'state.reservations' => ['required', 'array:parsnip,carrot,strawberry'],
            'state.reservations.parsnip' => ['required', $integer, 'integer', 'between:0,1000000'],
            'state.reservations.carrot' => ['required', $integer, 'integer', 'between:0,1000000'],
            'state.reservations.strawberry' => ['required', $integer, 'integer', 'between:0,1000000'],
            'state.processor' => ['required', 'array:input,output,readyDay,startedDay'],
            'state.processor.input' => ['present', 'nullable', 'in:strawberry'],
            'state.processor.output' => ['required', $integer, 'integer', 'between:0,1'],
            'state.processor.readyDay' => ['required', $integer, 'integer', 'between:0,1000000'],
            'state.processor.startedDay' => ['required', $integer, 'integer', 'between:0,1000000'],
            'state.dailyActions' => ['present', 'array'],
            'state.lastNightDay' => ['required', $integer, 'integer', 'between:0,1000000'],
        ];
        foreach (['money', 'planted', 'harvested', 'earned'] as $key) {
            $rules["state.$key"] = ['required', $integer, 'integer', 'between:0,1000000000'];
        }
        foreach (['seeds', 'produce'] as $bag) {
            $keys = $bag === 'produce' ? ['parsnip', 'carrot', 'strawberry', 'jam'] : ['parsnip', 'carrot', 'strawberry'];
            $rules["state.$bag"] = ['required', 'array:'.implode(',', $keys)];
            foreach ($keys as $crop) {
                $rules["state.$bag.$crop"] = ['required', $integer, 'integer', 'between:0,1000000'];
            }
        }
        if ($legacy) {
            $rules['state'] = ['required', 'array:version,farmerName,day,minutes,money,energy,seeds,produce,selectedSeed,planted,harvested,earned,questReward,player,tiles'];
            $rules['state.version'] = ['required', $integer, 'in:1'];
            $rules['state.produce'] = ['required', 'array:parsnip,carrot,strawberry'];
            unset($rules['state.produce.jam']);
            foreach (array_keys($rules) as $key) {
                if (preg_match('/^state\.(upgrades|horse|orders|reservations|processor|dailyActions|lastNightDay)(\.|$)/', $key)) unset($rules[$key]);
            }
        }
        $validator = Validator::make($input, $rules);
        $validator->after(function ($validator) use ($input, $legacy) {
            if (array_diff(array_keys($input), ['revision', 'state'])) {
                $validator->errors()->add('request', 'Unknown request keys.');
            }
            if (!$legacy && !$validator->errors()->any()) {
                $state = $input['state'];
                $templates = ['carrot-5'=>['carrot',5,320], 'parsnip-8'=>['parsnip',8,320], 'strawberry-3'=>['strawberry',3,300]];
                $horse = $state['horse']; $upgrades = $state['upgrades']; $job = $state['processor']; $day = $state['day'];
                if ($horse['owned'] !== $upgrades['stable'] || ($horse['mounted'] && !$horse['owned']) ||
                    ($upgrades['plow'] && !$horse['owned']) ||
                    ($horse['feedDay'] !== 0 && $horse['feedDay'] !== $day) ||
                    $horse['feedBonus'] !== ($horse['feedDay'] === $day) ||
                    (!$horse['owned'] && ($horse['name'] !== '' || $horse['feedDay'] !== 0))) {
                    $validator->errors()->add('state.horse', 'Horse ownership, equipment and daily feed must agree.');
                }
                // JSON key order is irrelevant.
                $idle = $job['input'] === null && $job['output'] === 0 && $job['readyDay'] === 0 && $job['startedDay'] === 0;
                $pending = $job['input'] === 'strawberry' && $job['output'] === 0 && $job['startedDay'] === $day && $job['readyDay'] === $day + 1;
                $ready = $job['input'] === null && $job['output'] === 1 && $job['startedDay'] >= 1 && $job['readyDay'] === $job['startedDay'] + 1 && $job['readyDay'] <= $day;
                if (!($idle || ($upgrades['jamMaker'] && ($pending || $ready)))) $validator->errors()->add('state.processor', 'Invalid production slot.');
                if ($state['lastNightDay'] >= $day) $validator->errors()->add('state.lastNightDay', 'Night must precede today.');
                $seen = [];
                foreach ($state['orders'] as $i => $order) {
                    $id = $order['id'];
                    if (!isset($templates[$id]) || isset($seen[$id]) ||
                        [$order['crop'],$order['required'],$order['reward']] !== ($templates[$id] ?? []) ||
                        $order['delivered'] !== ($order['completed'] ? $order['required'] : 0)) {
                        $validator->errors()->add("state.orders.$i", 'Use a unique known offer with consistent completion.');
                    }
                    $seen[$id] = true;
                }
                if ($state['dailyActions'] !== []) $validator->errors()->add('state.dailyActions', 'No daily action keys are supported.');
            }
            $tiles = $input['state']['tiles'] ?? [];
            foreach ((is_array($tiles) ? $tiles : []) as $index => $tile) {
                if (!is_array($tile)) continue;
                $crop = $tile['crop'] ?? null;
                $age = $tile['age'] ?? null;
                $days = ['parsnip' => 2, 'carrot' => 3, 'strawberry' => 4];
                if (($crop === null && $age !== 0) ||
                    (is_string($crop) && isset($days[$crop]) &&
                        ((is_int($age) && $age > $days[$crop]) || ($tile['tilled'] ?? null) !== true))) {
                    $validator->errors()->add("state.tiles.$index", 'Crop, soil and age must agree.');
                }
            }
        });
        $validated = $validator->validate()['state'];
        return $legacy ? $this->validate(['revision'=>$input['revision'], 'state'=>$this->migrateV1($validated)]) : $validated;
    }

    private function migrateV1(array $state): array
    {
        $defaults = [
            'version'=>2,
            'upgrades'=>['wateringCan'=>0,'sprinkler'=>false,'plow'=>false,'stable'=>false,'jamMaker'=>false],
            'horse'=>['owned'=>false,'name'=>'','mounted'=>false,'feedDay'=>0,'feedBonus'=>false,'x'=>180,'y'=>240],
            'orders'=>[
                ['id'=>'carrot-5','crop'=>'carrot','required'=>5,'reward'=>320,'delivered'=>0,'completed'=>false],
                ['id'=>'parsnip-8','crop'=>'parsnip','required'=>8,'reward'=>320,'delivered'=>0,'completed'=>false],
                ['id'=>'strawberry-3','crop'=>'strawberry','required'=>3,'reward'=>300,'delivered'=>0,'completed'=>false],
            ], 'reservations'=>['parsnip'=>0,'carrot'=>0,'strawberry'=>0],
            'processor'=>['input'=>null,'output'=>0,'readyDay'=>0,'startedDay'=>0], 'dailyActions'=>[], 'lastNightDay'=>0,
        ];
        $state['produce'] = array_replace(['jam'=>0], $state['produce'] ?? []);
        $migrated = array_replace_recursive($defaults, $state);
        $migrated['version'] = 2;
        return $migrated;
    }

    public function leaderboard()
    {
        $rows = DB::table('cloud_saves')->join('users', 'users.id', '=', 'cloud_saves.user_id')
            ->where('leaderboard_opt_in', true)->orderByDesc('score')->orderBy('users.id')
            ->limit(50)->get(['public_name', 'score']);
        return response()->json(['entries' => $rows->map(fn ($row) => [
            'public_name' => $row->public_name,
            'score' => (int) $row->score,
        ])]);
    }
}
