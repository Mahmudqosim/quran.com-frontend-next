import { useContext, useState } from 'react';

import { useSelector } from '@xstate/react';
import Fuse from 'fuse.js';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';

import styles from './ReciterSelectionBody.module.scss';

import IconSearch from '@/icons/search.svg';
import DataFetcher from 'src/components/DataFetcher';
import Input from 'src/components/dls/Forms/Input';
import RadioGroup, { RadioGroupOrientation } from 'src/components/dls/Forms/RadioGroup/RadioGroup';
import SpinnerContainer from 'src/components/dls/Spinner/SpinnerContainer';
import usePersistPreferenceGroup from 'src/hooks/auth/usePersistPreferenceGroup';
import { makeAvailableRecitersUrl } from 'src/utils/apiPaths';
import { logEmptySearchResults, logItemSelectionChange } from 'src/utils/eventLogger';
import { AudioPlayerMachineContext } from 'src/xstate/AudioPlayerMachineContext';
import { RecitersResponse } from 'types/ApiResponses';
import PreferenceGroup from 'types/auth/PreferenceGroup';
import QueryParam from 'types/QueryParam';
import Reciter from 'types/Reciter';

export const filterReciters = (reciters, searchQuery: string): Reciter[] => {
  const fuse = new Fuse(reciters, {
    keys: ['name', 'languageName', 'translatedName.name', 'qirat.name', 'style.name'],
    threshold: 0.3,
  });

  const filteredReciter = fuse.search(searchQuery).map(({ item }) => item);
  if (!filteredReciter.length) {
    logEmptySearchResults(searchQuery, 'settings_drawer_translation');
  }
  return filteredReciter as Reciter[];
};

const DEFAULT_RECITATION_STYLE = 'Murattal';

const SettingsReciter = () => {
  const { lang, t } = useTranslation('common');
  const {
    isLoading,
    actions: { onXstateSettingsChange },
  } = usePersistPreferenceGroup();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const audioService = useContext(AudioPlayerMachineContext);
  const selectedReciterId = useSelector(audioService, (state) => state.context.reciterId);

  // given the reciterId, get the full reciter object.
  const onSelectedReciterChange = (reciterId: string, reciters: Reciter[]) => {
    if (!reciterId) return;
    const reciter = reciters.find((r) => r.id === Number(reciterId));
    logItemSelectionChange('selected_reciter', reciter.id);
    router.query[QueryParam.Reciter] = String(reciter.id);
    router.push(router, undefined, { shallow: true });

    const previousReciterId = selectedReciterId;
    onXstateSettingsChange(
      'reciter',
      reciter.id,
      () => audioService.send({ type: 'CHANGE_RECITER', reciterId: Number(reciterId) }),
      () => audioService.send({ type: 'CHANGE_RECITER', reciterId: previousReciterId }),
      PreferenceGroup.AUDIO,
    );
  };

  return (
    <div>
      <div className={styles.searchInputContainer}>
        <SpinnerContainer isLoading={isLoading}>
          <Input
            prefix={<IconSearch />}
            id="translations-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('settings.search-reciter')}
            fixedWidth={false}
            containerClassName={styles.input}
          />
        </SpinnerContainer>
      </div>
      <DataFetcher
        queryKey={makeAvailableRecitersUrl(lang)}
        render={(data: RecitersResponse) => {
          const filteredReciters = searchQuery
            ? filterReciters(data.reciters, searchQuery)
            : data.reciters;

          return (
            <RadioGroup.Root
              label="reciter"
              orientation={RadioGroupOrientation.Vertical}
              value={selectedReciterId.toString()}
              onChange={(newId) => onSelectedReciterChange(newId, data.reciters)}
            >
              {filteredReciters
                .sort((a, b) => (a.name + a.id > b.name + b.id ? 1 : -1))
                .map((reciter) => {
                  const reciterId = reciter.id.toString();
                  return (
                    <div className={styles.reciter} key={reciterId}>
                      <RadioGroup.Item value={reciterId} id={reciterId} />

                      <label htmlFor={reciterId} className={styles.reciterLabel}>
                        {reciter.translatedName.name}
                        {reciter.style.name !== DEFAULT_RECITATION_STYLE && (
                          <span className={styles.recitationStyle}>{reciter.style.name}</span>
                        )}
                      </label>
                    </div>
                  );
                })}
            </RadioGroup.Root>
          );
        }}
      />
    </div>
  );
};

export default SettingsReciter;
